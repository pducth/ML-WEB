# -*- coding: utf-8 -*-
"""
Hair Routine Engine - hệ chuyên gia tư vấn tóc dạng rule-based (HairCare / Moroccanoil Vietnam)

Toàn bộ câu hỏi + luật + ánh xạ sản phẩm nằm trong file JSON, code chỉ là "bộ máy" đọc cấu hình
(BR-QUZ-08). Cùng bộ đáp án + cùng tồn kho luôn ra cùng kết quả (BR-QUZ-02): không dùng random,
không phụ thuộc thứ tự key của dict hay thứ tự chọn của câu multi-select.

Cách dùng nhanh:

    from hair_routine_engine import HairRoutineEngine, JsonlEventSink

    engine = HairRoutineEngine.from_files()                  # đọc 2 file JSON cùng thư mục
    inventory = {"8161092731097": {"active": True, "available": 12}, ...}   # key = product_id
    result = engine.infer(answers, inventory)                # hàm suy diễn thuần (không side-effect)
    result = engine.run_quiz(answers, inventory, JsonlEventSink("quiz_events.jsonl"))  # + ghi Quiz_Event

Quy ước tồn kho: inventory[product_id] = {"active": bool, "available": int}, trong đó
available = On Hand - Reserved (BR-ORD-01). Sản phẩm không có trong inventory được coi là không khả dụng.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import numbers
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any, Callable, Mapping, Optional

HERE = Path(__file__).resolve().parent
DEFAULT_RULESET = HERE / "hair_routine_rules.json"
DEFAULT_TAGS = HERE / "product_quiz_catalog.json"

SCALP_VALUES = {"normal", "oily", "dry_sensitive", "flaky", "thinning"}


class RulesetError(ValueError):
    """File cấu hình (ruleset / nhãn sản phẩm) không hợp lệ."""


class QuizInputError(ValueError):
    """Bộ đáp án không hợp lệ (thiếu câu bắt buộc, sai option...). `issues` liệt kê từng lỗi."""

    def __init__(self, issues: list[str]):
        super().__init__("; ".join(issues))
        self.issues = issues


# ----------------------------------------------------------------------------------------------
# Quiz_Event ẩn danh (BR-QUZ-10)
# ----------------------------------------------------------------------------------------------
class ListEventSink:
    """Sink trong bộ nhớ, dùng cho test."""

    def __init__(self) -> None:
        self.events: list[dict] = []

    def append(self, event: dict) -> None:
        self.events.append(event)


class JsonlEventSink:
    """Mỗi lượt Quiz ghi một dòng JSON vào file."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)

    def append(self, event: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")


def build_quiz_event(result: Mapping[str, Any], now: Optional[dt.datetime] = None) -> dict:
    """Bản ghi ẩn danh: chỉ gồm thời gian, nhãn chính/phụ, ruleset_version. KHÔNG có đáp án, user id, IP..."""
    now = now or dt.datetime.now(dt.timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=dt.timezone.utc)
    return {
        "timestamp": now.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "primary_label": result["primary_label"],
        "secondary_label": result["secondary_label"],
        "ruleset_version": result["ruleset_version"],
    }


# ----------------------------------------------------------------------------------------------
# Engine
# ----------------------------------------------------------------------------------------------
class HairRoutineEngine:
    def __init__(self, rules_path: Mapping[str, Any] | str | Path | None = None,
                 products_path: Mapping[str, Any] | str | Path | None = None,
                 inventory_provider: Optional[Callable[[str], Any]] = None,
                 event_db: str | Path | None = None):
        if isinstance(rules_path, Mapping) and isinstance(products_path, Mapping):
            loaded_ruleset = dict(rules_path)
            loaded_tags = dict(products_path)
        else:
            ruleset_path = Path(rules_path) if rules_path is not None else DEFAULT_RULESET
            tags_path = Path(products_path) if products_path is not None else DEFAULT_TAGS
            with ruleset_path.open(encoding="utf-8") as f:
                loaded_ruleset = json.load(f)
            with tags_path.open(encoding="utf-8") as f:
                loaded_tags = json.load(f)
            if isinstance(loaded_tags, list):
                loaded_tags = {"products": loaded_tags}
        self.inventory_provider = inventory_provider
        self.event_db = Path(event_db) if event_db is not None else None
        self.products: list[dict] = loaded_tags["products"]
        self.ruleset = loaded_ruleset
        self.version: str = loaded_ruleset["ruleset_version"]
        self.priority: list[str] = loaded_ruleset["labels"]["priority_order"]
        self.rank = {lab: i for i, lab in enumerate(self.priority)}
        self.goal_to_label: dict[str, str] = loaded_ruleset["labels"].get("goal_to_label", {})
        self.questions = {q["id"]: q for s in loaded_ruleset["steps"] for q in s["questions"]}
        self.preference: dict[str, str] = loaded_ruleset["routine"].get("preference", {})
        self.routine_steps = sorted(loaded_ruleset["routine"]["steps"], key=lambda s: s["order"])
        self.tags = {p["key"]: p for p in self.products}
        self.key_by_pid = {str(p["product_id"]): p["key"] for p in self.products}
        self.validate_config()

    @classmethod
    def from_files(cls, ruleset_path: str | Path = DEFAULT_RULESET,
                   tags_path: str | Path = DEFAULT_TAGS, inventory_provider=None,
                   event_db=None) -> "HairRoutineEngine":
        return cls(ruleset_path, tags_path, inventory_provider, event_db)

    # ------------------------------------------------------------------ kiểm tra cấu hình
    def validate_config(self) -> None:
        """Bắt lỗi cấu hình ngay lúc nạp, tránh để lỗi nổ ở lúc khách đang làm Quiz."""
        errs: list[str] = []
        labels = set(self.ruleset["labels"]["definitions"])
        if set(self.priority) != labels or len(self.priority) != len(set(self.priority)):
            errs.append("priority_order phải liệt kê đúng 1 lần mỗi nhãn trong labels.definitions")
        goal_options = {o["id"] for o in self.questions["primary_goal"]["options"]}
        for goal, lab in self.goal_to_label.items():
            if goal not in goal_options or lab not in labels:
                errs.append(f"labels.goal_to_label: '{goal}' -> '{lab}' không hợp lệ")
        pref = self.preference
        if pref:
            pq = self.questions.get(pref.get("question"))
            if pq is None or pq["type"] != "single" or pq["required"]:
                errs.append("routine.preference.question phải là một câu single-select không bắt buộc")
            elif pref.get("none_value") not in {o["id"] for o in pq["options"]}:
                errs.append("routine.preference.none_value không thuộc các option của câu hỏi")
        step_ids = [s["id"] for s in self.routine_steps]
        if len(step_ids) != 4 or len(step_ids) != len(set(step_ids)):
            errs.append("routine.steps phải có đúng 4 bước với id không trùng")
        if not self.products:
            errs.append("product_quiz_catalog.json không có sản phẩm nào")
        if len(self.tags) != len(self.products):
            errs.append("key sản phẩm bị trùng trong file nhãn sản phẩm")

        # nhãn sản phẩm (BR-PRD-07: da đầu + nhu cầu + bước)
        pids = [str(p["product_id"]) for p in self.products]
        if len(pids) != len(set(pids)):
            errs.append("product_id bị trùng trong file nhãn sản phẩm")
        for k, p in self.tags.items():
            q = p.get("quiz") or {}
            if not isinstance(p.get("active"), bool):
                errs.append(f"{k}: active phải là boolean")
            available = p.get("inventory_available")
            if (isinstance(available, bool) or not isinstance(available, numbers.Real)
                    or not math.isfinite(float(available)) or available < 0):
                errs.append(f"{k}: inventory_available phải là số hữu hạn không âm")
            if q.get("step") not in step_ids:
                errs.append(f"{k}: thiếu/sai quiz.step")
            if not q.get("needs") or not set(q["needs"]) <= labels:
                errs.append(f"{k}: thiếu/sai quiz.needs")
            sc = set(q.get("scalp") or [])
            if not sc or not (sc == {"all"} or sc <= SCALP_VALUES):
                errs.append(f"{k}: thiếu/sai quiz.scalp")
            if pref and not set(q.get("formula") or []) <= {
                    o["id"] for o in self.questions[pref["question"]]["options"]} - {pref["none_value"]}:
                errs.append(f"{k}: quiz.formula chứa giá trị không thuộc các option của câu ưu tiên công thức")

        # luật
        for r in self.ruleset["rules"]:
            if r["label"] not in labels:
                errs.append(f"{r['id']}: nhãn không tồn tại")
            self._check_cond(r["when"], r["id"], errs)
        if self.ruleset["fallback"]["label"] not in labels:
            errs.append("fallback.label không tồn tại")

        # ánh xạ routine / add-on
        by_label = self.ruleset["routine"]["by_label"]
        for lab in labels:
            for sid in step_ids:
                cands = by_label.get(lab, {}).get(sid)
                if not cands:
                    errs.append(f"routine.by_label.{lab}.{sid} đang trống")
                for c in cands or []:
                    self._check_candidate(c, f"{lab}.{sid}", errs, step=sid)
        for lab, cands in self.ruleset["routine"].get("addons_by_label", {}).items():
            if lab not in labels:
                errs.append(f"addons_by_label.{lab}: nhãn không tồn tại")
            for c in cands:
                self._check_candidate(c, f"addon.{lab}", errs)
        if self.ruleset["routine"].get("max_addons") != 1:
            errs.append("routine.max_addons phải bằng 1")
        min_steps = self.ruleset["routine"].get("min_steps")
        if (isinstance(min_steps, bool) or not isinstance(min_steps, int)
                or not 0 <= min_steps <= len(step_ids)):
            errs.append("routine.min_steps phải nằm trong khoảng 0-4")
        if errs:
            raise RulesetError("Cấu hình không hợp lệ:\n- " + "\n- ".join(errs))

    def _check_candidate(self, c: dict, where: str, errs: list[str], step: Optional[str] = None) -> None:
        t = self.tags.get(c["product"])
        if t is None:
            errs.append(f"{where}: sản phẩm '{c['product']}' không có trong file nhãn")
        elif step and t["quiz"]["step"] != step:
            errs.append(f"{where}: '{c['product']}' có quiz.step={t['quiz']['step']} nhưng đang đặt ở bước {step}")
        if c.get("when"):
            self._check_cond(c["when"], f"{where}/{c['product']}", errs)

    def _check_cond(self, cond: dict, where: str, errs: list[str]) -> None:
        if not isinstance(cond, Mapping):
            errs.append(f"{where}: điều kiện phải là một đối tượng")
            return
        for comb in ("all", "any"):
            if comb in cond:
                children = cond[comb]
                if not isinstance(children, list) or not children:
                    errs.append(f"{where}: '{comb}' phải là danh sách điều kiện không rỗng")
                    return
                if len(cond) != 1:
                    errs.append(f"{where}: chỉ được dùng một toán tử điều kiện cấp cao nhất")
                for sub in children:
                    self._check_cond(sub, where, errs)
                return
        if "not" in cond:
            if len(cond) != 1:
                errs.append(f"{where}: 'not' không được kết hợp với toán tử khác")
            self._check_cond(cond["not"], where, errs)
            return
        q = self.questions.get(cond.get("q"))
        if q is None:
            errs.append(f"{where}: câu hỏi '{cond.get('q')}' không tồn tại")
            return
        op, val = cond.get("op"), cond.get("value")
        allowed = {"single": {"eq", "in"}, "multi": {"contains_any"}}[q["type"]]
        if op not in allowed:
            errs.append(f"{where}: toán tử '{op}' không dùng được cho câu {q['type']} '{q['id']}'")
        opts = {o["id"] for o in q["options"]}
        if op == "eq":
            vals = [val]
        elif not isinstance(val, list):
            errs.append(f"{where}: giá trị của toán tử '{op}' phải là danh sách")
            return
        else:
            vals = val
        if not all(isinstance(item, str) for item in vals) or not set(vals) <= opts:
            errs.append(f"{where}: giá trị {vals} không thuộc các option của '{q['id']}'")

    # ------------------------------------------------------------------ chuẩn hóa đáp án (BR-QUZ-01)
    def validate_answers(self, answers: Mapping[str, Any]) -> dict[str, Any]:
        """Kiểm tra và chuẩn hóa đáp án. Multi-select được sắp xếp + khử trùng lặp để kết quả không phụ thuộc thứ tự chọn."""
        if not isinstance(answers, Mapping):
            raise QuizInputError(["Câu trả lời phải là một đối tượng"])
        issues: list[str] = []
        norm: dict[str, Any] = {}
        for qid in answers:
            if qid not in self.questions:
                issues.append(f"Câu hỏi không tồn tại: {qid}")
        for qid, q in self.questions.items():
            raw = answers.get(qid)
            empty = raw is None or raw == "" or (
                isinstance(raw, (list, tuple, set)) and not raw
            )
            if empty:
                if q["required"]:
                    issues.append(f"Thiếu câu trả lời bắt buộc (*): {qid}")
                continue
            opts = {o["id"]: o for o in q["options"]}
            if q["type"] == "single":
                if not isinstance(raw, str) or raw not in opts:
                    issues.append(f"{qid}: đáp án không hợp lệ: {raw!r}")
                else:
                    norm[qid] = raw
            else:
                if isinstance(raw, str):
                    vals = [raw]
                elif isinstance(raw, (list, tuple, set)):
                    vals = list(raw)
                else:
                    issues.append(f"{qid}: đáp án nhiều lựa chọn phải là danh sách")
                    continue
                bad = [v for v in vals if not isinstance(v, str) or v not in opts]
                if bad:
                    issues.append(f"{qid}: đáp án không hợp lệ: {bad}")
                    continue
                vals = sorted(set(vals))
                excl = [o for o, d in opts.items() if d.get("exclusive")]
                if any(v in excl for v in vals) and len(vals) > 1:
                    issues.append(f"{qid}: đáp án loại trừ ({', '.join(excl)}) không được chọn cùng đáp án khác")
                    continue
                norm[qid] = vals
        if issues:
            raise QuizInputError(issues)
        return norm

    # ------------------------------------------------------------------ đánh giá luật
    def _eval(self, cond: Mapping[str, Any], ans: Mapping[str, Any]) -> bool:
        if "all" in cond:
            return all(self._eval(c, ans) for c in cond["all"])
        if "any" in cond:
            return any(self._eval(c, ans) for c in cond["any"])
        if "not" in cond:
            return not self._eval(cond["not"], ans)
        v = ans.get(cond["q"])
        if v is None:                      # câu không bắt buộc chưa trả lời -> luật không khớp
            return False
        op, val = cond["op"], cond["value"]
        if op == "eq":
            return v == val
        if op == "in":
            return v in val
        if op == "contains_any":
            return bool(set(v) & set(val))
        raise RulesetError(f"Toán tử không hỗ trợ: {op}")

    def _when_ok(self, c: Mapping[str, Any], ans: Mapping[str, Any]) -> bool:
        return True if not c.get("when") else self._eval(c["when"], ans)

    # ------------------------------------------------------------------ tồn kho (BR-QUZ-05)
    def _in_stock(self, key: str, inventory: Mapping[str, Mapping[str, Any]]) -> bool:
        rec = inventory.get(str(self.tags[key]["product_id"]))
        pol = self.ruleset["inventory_policy"]
        if rec is None:
            return False
        if not isinstance(rec, Mapping):
            raise ValueError(f"Tồn kho không hợp lệ cho sản phẩm {key}: cần một đối tượng")
        if pol["require_active"] and "active" not in rec:
            raise ValueError(f"Tồn kho không hợp lệ cho sản phẩm {key}: thiếu active")
        if pol["require_active"] and rec["active"] is not True:
            return False
        if "available" not in rec:
            raise ValueError(f"Tồn kho không hợp lệ cho sản phẩm {key}: thiếu available")
        available = rec["available"]
        if isinstance(available, bool) or not isinstance(available, numbers.Real):
            raise ValueError(f"Tồn kho không hợp lệ cho sản phẩm {key}: available phải là số")
        if not math.isfinite(float(available)):
            raise ValueError(f"Tồn kho không hợp lệ cho sản phẩm {key}: available phải hữu hạn")
        return available > pol["require_available_greater_than"]

    def _prefers(self, key: str, ans: Mapping[str, Any]) -> bool:
        """True when the shopper asked for a formula style and the product carries that tag."""
        want = ans.get(self.preference.get("question")) if self.preference else None
        return bool(want) and want != self.preference["none_value"] and want in self.tags[key]["quiz"].get("formula", [])

    def _prefer_first(self, keys: list[str], ans: Mapping[str, Any]) -> list[str]:
        """Stable reorder of products that already suit the shopper: preferred formula first. Never drops one."""
        return sorted(keys, key=lambda k: not self._prefers(k, ans))

    def _scalp_ok(self, key: str, scalp: str) -> bool:
        s = self.tags[key]["quiz"]["scalp"]
        return "all" in s or scalp in s

    def _product_view(self, key: str) -> dict:
        t = self.tags[key]
        return {
            "key": key,
            "product_id": t["product_id"],
            "name": t["name"],
            "category": t["category"],
            "url": t.get("url"),
            "image_url": t.get("image_url"),
            "price_usd": t.get("price_usd"),
        }

    # ------------------------------------------------------------------ chọn sản phẩm cho từng bước
    def _pick_step(self, step: dict, label: str, ans: Mapping[str, Any],
                   inventory: Mapping[str, Mapping[str, Any]]) -> tuple[dict, Optional[dict]]:
        msgs = self.ruleset["messages"]
        scalp = ans["scalp_condition"]
        sid = step["id"]
        base = {"step_id": sid, "step_order": step["order"], "step_title_en": step["title_en"],
                "step_title_vi": step["title_vi"]}
        cands = self.ruleset["routine"]["by_label"][label][sid]
        eligible = self._prefer_first(
            [c["product"] for c in cands if self._when_ok(c, ans) and self._scalp_ok(c["product"], scalp)], ans)

        if not eligible:   # không có ứng viên phù hợp với tình trạng khách (không phải do hết hàng)
            note = {"code": "STEP_SKIPPED_NO_MATCH", "step_id": sid,
                    "message_vi": msgs["skipped_no_match_vi"].format(step=step["title_en"])}
            return {**base, "status": "skipped", "product": None, "substituted_for": None,
                    "reason": "no_match", "note": note["message_vi"]}, note

        preferred = eligible[0]
        for key in eligible:                                    # 1) ứng viên khai báo trong ruleset
            if self._in_stock(key, inventory):
                return self._chosen(base, key, preferred, label, msgs)

        # 2) thay thế tương đương theo nhãn sản phẩm.
        #    Loại mọi sản phẩm đã được khai báo ở bước này (kể cả bị điều kiện `when` loại ra, ví dụ mask
        #    dành cho tóc mảnh với khách tóc dày): ruleset đã chủ động gạt chúng, không cho quay lại làm hàng thay thế.
        listed = {c["product"] for c in cands}
        pool = [k for k, t in self.tags.items()
                if t["quiz"]["step"] == sid and label in t["quiz"]["needs"] and t["allow_auto_substitute"]
                and k not in listed and self._scalp_ok(k, scalp) and self._in_stock(k, inventory)]
        pool.sort(key=lambda k: (not self._prefers(k, ans), len(self.tags[k]["quiz"]["needs"]), k))
        if pool:
            return self._chosen(base, pool[0], preferred, label, msgs)

        # 3) không có gì thay thế -> bỏ bước kèm ghi chú
        note = {"code": "STEP_SKIPPED_OUT_OF_STOCK", "step_id": sid,
                "message_vi": msgs["skipped_out_of_stock_vi"].format(
                    step=step["title_en"], original=self.tags[preferred]["name"])}
        return {**base, "status": "skipped", "product": None, "substituted_for": preferred,
                "reason": "out_of_stock", "note": note["message_vi"]}, note

    def _chosen(self, base: dict, key: str, preferred: str, label: str, msgs: dict) -> tuple[dict, Optional[dict]]:
        if key == preferred:
            return {**base, "status": "ok", "product": self._product_view(key), "substituted_for": None,
                    "reason": None, "note": None}, None
        note = {"code": "STEP_SUBSTITUTED", "step_id": base["step_id"],
                "message_vi": msgs["substituted_vi"].format(
                    original=self.tags[preferred]["name"], replacement=self.tags[key]["name"])}
        return {**base, "status": "substituted", "product": self._product_view(key), "substituted_for": preferred,
                "reason": "out_of_stock", "note": note["message_vi"]}, note

    def _pick_addon(self, secondary: Optional[str], ans: Mapping[str, Any],
                    inventory: Mapping[str, Mapping[str, Any]], used: set[str]) -> Optional[dict]:
        """Tối đa 1 Optional Add-on từ nhãn phụ: bỏ ứng viên trùng routine hoặc hết hàng (BR-QUZ-04/05)."""
        if not secondary:
            return None
        scalp = ans["scalp_condition"]
        cands = self.ruleset["routine"].get("addons_by_label", {}).get(secondary, [])
        eligible = self._prefer_first(
            [c["product"] for c in cands if self._when_ok(c, ans) and self._scalp_ok(c["product"], scalp)], ans)
        for key in eligible:
            if key in used or not self._in_stock(key, inventory):
                continue
            return {"label": secondary, "product": self._product_view(key)}
        return None

    # ------------------------------------------------------------------ HÀM SUY DIỄN CHÍNH
    def _catalog_inventory(self) -> dict[str, dict[str, Any]]:
        inventory = {}
        for product in self.products:
            product_id = str(product["product_id"])
            if self.inventory_provider:
                status = self.inventory_provider(product_id)
                if isinstance(status, Mapping):
                    inventory[product_id] = dict(status)
                else:
                    inventory[product_id] = {
                        "active": product.get("active") is True,
                        "available": 0 if status is None else status,
                    }
            else:
                inventory[product_id] = {
                    "active": product.get("active") is True,
                    "available": product.get("inventory_available", 0),
                }
        return inventory

    def infer(self, answers: Mapping[str, Any],
              inventory: Optional[Mapping[str, Mapping[str, Any]]] = None) -> dict:
        """Đáp án -> nhãn chính/phụ -> routine 4 bước + add-on. Hàm thuần, tất định, không ghi log."""
        inventory = self._catalog_inventory() if inventory is None else inventory
        if not isinstance(inventory, Mapping):
            raise ValueError("inventory phải là một ánh xạ product_id -> active/available")
        ans = self.validate_answers(answers)

        # 1) Luật IF-THEN: duyệt theo thứ tự khai báo trong ruleset
        fired = [r for r in self.ruleset["rules"] if self._eval(r["when"], ans)]
        active = sorted({r["label"] for r in fired}, key=self.rank.__getitem__)   # theo thứ tự ưu tiên

        notes: list[dict] = []
        fb = self.ruleset["fallback"]
        fallback_used = not active
        if fallback_used:                                       # BR-QUZ-06: không khớp luật nào -> Hydrating
            active = [fb["label"]]
            notes.append({"code": "FALLBACK", "step_id": None, "message_vi": self.ruleset["messages"]["fallback_vi"]})
        # BR-QUZ-03 (v2): mục tiêu chính của khách quyết định nhãn chính khi luật của mục tiêu đó đã khớp;
        # các nhãn còn lại theo thứ tự ưu tiên, nhãn phụ là nhãn kế tiếp.
        goal_label = self.goal_to_label.get(ans.get("primary_goal"))
        if goal_label in active:
            active = [goal_label] + [lab for lab in active if lab != goal_label]
        primary = active[0]
        secondary = active[1] if len(active) > 1 else None

        # 2) Routine theo nhãn chính
        routine, used = [], set()
        for step in self.routine_steps:
            item, note = self._pick_step(step, primary, ans, inventory)
            routine.append(item)
            if note:
                notes.append(note)
            if item["product"]:
                used.add(item["product"]["key"])
        n_steps = sum(1 for i in routine if i["product"])
        meets_min = n_steps >= self.ruleset["routine"]["min_steps"]
        if not meets_min:
            notes.append({"code": "MIN_STEPS_NOT_MET", "step_id": None,
                          "message_vi": self.ruleset["messages"]["min_steps_vi"].format(n=n_steps)})

        # 3) Add-on theo nhãn phụ
        addon = self._pick_addon(secondary, ans, inventory, used)

        defs = self.ruleset["labels"]["definitions"]
        return {
            "ruleset_version": self.version,
            "primary_label": primary,
            "secondary_label": secondary,
            "active_labels": active,
            "fallback_used": fallback_used,
            "matched_rules": [{"id": r["id"], "label": r["label"], "description": r["description"]} for r in fired]
                             or [{"id": fb["rule_id"], "label": fb["label"], "description": fb["description"]}],
            "diagnosis": {"label": primary, **defs[primary],
                          "secondary": ({"label": secondary, **defs[secondary]} if secondary else None)},
            "routine": routine,
            "addon": addon,
            "notes": notes,
            "meets_min_steps": meets_min,
            "disclaimer": self.ruleset["disclaimer"],
        }

    def run_quiz(self, answers: Mapping[str, Any],
                 inventory: Optional[Mapping[str, Mapping[str, Any]]] = None,
                 event_sink: Any = None, now: Optional[dt.datetime] = None) -> dict:
        """infer() + ghi 1 Quiz_Event ẩn danh (BR-QUZ-10). `now` cho phép cố định giờ khi test."""
        result = self.infer(answers, inventory)
        if event_sink is None:
            raise ValueError("Cần truyền event_sink để ghi sự kiện Quiz")
        event_sink.append(build_quiz_event(result, now))
        return result

    def recommend(self, answers: Mapping[str, Any], log_event: bool = True) -> dict:
        """Tương thích giao diện cũ; dùng tồn kho catalog hoặc inventory_provider nếu được cấu hình."""
        result = self.infer(answers)
        if log_event:
            self.log_event(result)
        legacy = dict(result)
        legacy["routine"] = [
            {
                "step": item["step_title_en"],
                "step_id": item["step_id"],
                "product": (dict(self.tags[item["product"]["key"]]) if item["product"] else None),
                "status": item["status"],
                "note": item["note"],
            }
            for item in result["routine"]
        ]
        legacy["optional_addon"] = (
            dict(self.tags[result["addon"]["product"]["key"]]) if result["addon"] else None
        )
        legacy["matched_rule_ids"] = [rule["id"] for rule in result["matched_rules"]]
        legacy["notes"] = [note["message_vi"] for note in result["notes"]]
        return legacy

    def log_event(self, result: Mapping[str, Any]) -> None:
        """Ghi Quiz_Event ẩn danh vào SQLite; tuyệt đối không lưu đáp án hoặc định danh người dùng."""
        if self.event_db is None:
            return
        self.event_db.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.event_db)) as con:
            with con:
                con.execute(
                    """CREATE TABLE IF NOT EXISTS Quiz_Event (
                        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        occurred_at TEXT NOT NULL,
                        primary_label TEXT NOT NULL,
                        secondary_label TEXT,
                        ruleset_version TEXT NOT NULL,
                        matched_rule_ids TEXT NOT NULL
                    )"""
                )
                con.execute(
                    """INSERT INTO Quiz_Event (
                        occurred_at, primary_label, secondary_label, ruleset_version, matched_rule_ids
                    ) VALUES (?, ?, ?, ?, ?)""",
                    (
                        dt.datetime.now(dt.timezone.utc).isoformat(),
                        result["primary_label"],
                        result["secondary_label"],
                        result["ruleset_version"],
                        json.dumps([rule["id"] for rule in result["matched_rules"]]),
                    ),
                )


def inventory_from_catalog_json(products_json_path: str | Path) -> dict[str, dict]:
    """Đọc trạng thái active/tồn kho ban đầu; production phải dùng số lượng biến thể cập nhật."""
    with open(products_json_path, encoding="utf-8") as f:
        cat = json.load(f)
    return {str(p["product_id"]): {"active": p.get("active") is True,
                                   "available": p.get("inventory_available", 0)}
            for p in cat}
