# -*- coding: utf-8 -*-
"""
Bộ test cho Hair Routine Engine (ruleset 3.0.0, 8 câu hỏi, 150 sản phẩm).   Chạy:  python -m unittest test_hair_routine_engine -v

Nhóm test:
  1. Toàn vẹn cấu hình (150 sản phẩm đủ nhãn, thứ tự ưu tiên, tham chiếu hợp lệ, mọi sản phẩm đều có đường vào)
  2. Bắt buộc trả lời (*) và chuẩn hóa đáp án (BR-QUZ-01)
  3. Luật + mục tiêu quyết định nhãn chính + nhãn phụ (BR-QUZ-02, 03)
  4. Cấu trúc routine 4 bước + 1 add-on (BR-QUZ-04)
  5. Tồn kho: Active / Available > 0, thay thế, bỏ bước (BR-QUZ-05)
  6. Fallback Hydrating (BR-QUZ-06)
  7. Tính tất định (BR-QUZ-02)
  8. Quiz_Event ẩn danh (BR-QUZ-10)
  9. Ưu tiên công thức (câu 8, tùy chọn): chỉ sắp xếp lại, không bao giờ loại sản phẩm / bước
 10. Vét cạn toàn bộ tổ hợp đáp án (property test) và độ phủ 150 sản phẩm
"""
import copy
import datetime as dt
import itertools
import json
import random
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from hair_routine_engine import (HairRoutineEngine, JsonlEventSink, ListEventSink, QuizInputError,
                                 RulesetError, build_quiz_event)

ENGINE = HairRoutineEngine.from_files()
PID = {k: t["product_id"] for k, t in ENGINE.tags.items()}   # key -> product_id
KEY = {v: k for k, v in PID.items()}
STOREFRONT = Path(__file__).resolve().parents[2] / "data" / "store" / "product_data" / "storefront" / "products.json"

# 5 mặt nạ phủ màu theo tông: chỉ chọn được khi biết tông tóc (quiz không hỏi), nên chỉ bán qua cửa hàng
TONE_ONLY = {"bordeaux-color-depositing-mask", "cocoa-color-depositing-mask", "copper-color-depositing-mask",
             "coral-color-depositing-mask", "rose-gold-color-depositing-mask"}


def stock(**overrides):
    """Tồn kho mẫu: mọi sản phẩm Active, còn 20. Mô phỏng cửa hàng thật: Color Care Shampoo đang hết hàng.
    overrides: key=số tồn (0 = hết) hoặc key=None (Inactive)."""
    inv = {pid: {"active": True, "available": 20} for pid in PID.values()}
    inv[PID["color-care-shampoo"]]["available"] = 0
    for k, v in overrides.items():
        k = k.replace("_", "-")
        if v is None:
            inv[PID[k]]["active"] = False
        else:
            inv[PID[k]]["available"] = v
    return inv


def all_out_except(*keys):
    return {PID[k]: {"active": True, "available": 5} for k in keys}


def answers(**kw):
    """Đáp án nền = tóc thẳng khỏe, da đầu bình thường, mục tiêu xoăn (không có luật nào khớp) -> chỉ khớp luật khi mình chủ động đổi."""
    base = dict(scalp_condition="normal", hair_damage="healthy", hair_texture="straight", hair_thickness="medium",
                wash_frequency="every_2_3_days", chemical_history=["none"], primary_goal="define_curls")
    base.update(kw)
    return base


def steps(result):
    return {i["step_id"]: (i["product"]["key"] if i["product"] else None) for i in result["routine"]}


# ================================================================================================
class T1_Config(unittest.TestCase):
    def test_150_products_have_full_quiz_tags(self):
        self.assertEqual(len(ENGINE.tags), 150)
        for k, t in ENGINE.tags.items():
            q = t["quiz"]
            self.assertIn(q["step"], {"cleanse", "condition", "treat", "style_protect"}, k)
            self.assertTrue(q["needs"], k)
            self.assertTrue(q["scalp"], k)
            self.assertIs(type(t["active"]), bool)
            self.assertIn("url", t)
            self.assertIn("image_url", t)
        self.assertEqual({t["brand"] for t in ENGINE.tags.values()}, {"Moroccanoil", "Davines", "Rahua", "AROMATICA"})

    def test_every_step_has_enough_products_in_the_catalog(self):
        by_step = {}
        for t in ENGINE.tags.values():
            by_step.setdefault(t["quiz"]["step"], []).append(t["key"])
        self.assertEqual({s: len(v) for s, v in by_step.items()}, {"cleanse": 36, "condition": 29, "treat": 46, "style_protect": 39})

    @unittest.skipUnless(STOREFRONT.exists(), "storefront dataset not generated")
    def test_catalog_matches_the_storefront_dataset(self):
        storefront = json.loads(STOREFRONT.read_text(encoding="utf-8"))
        self.assertEqual({str(p["product_id"]) for p in storefront}, {str(t["product_id"]) for t in ENGINE.tags.values()})
        self.assertEqual({p["key"] for p in storefront}, set(ENGINE.tags))

    def test_priority_order_matches_business_rule(self):
        self.assertEqual(ENGINE.priority, ["Repair", "Scalp", "Color", "Curl", "Hydration", "Volume", "Styling"])

    def test_every_goal_has_a_label(self):
        goals = {o["id"] for o in ENGINE.questions["primary_goal"]["options"]}
        self.assertEqual(len(goals), 7)
        self.assertEqual(set(ENGINE.goal_to_label), goals)
        self.assertEqual(set(ENGINE.goal_to_label.values()), set(ENGINE.priority))

    def test_eight_questions_seven_required_and_one_optional(self):
        ids = [s["id"] for s in ENGINE.ruleset["steps"]]
        self.assertEqual(ids, ["scalp", "hair_condition", "habits_history", "goal"])
        order = [q["id"] for s in ENGINE.ruleset["steps"] for q in s["questions"]]
        self.assertEqual(order, ["scalp_condition", "hair_texture", "hair_thickness", "hair_damage",
                                 "chemical_history", "wash_frequency", "primary_goal", "formula_preference"])
        req = {q: d["required"] for q, d in ENGINE.questions.items()}
        self.assertEqual([q for q, r in req.items() if not r], ["formula_preference"])
        self.assertNotIn("heat_styling", req)

    def test_english_copy_ships_with_every_question_and_option(self):
        for q in ENGINE.questions.values():
            self.assertTrue(q["text_en"], q["id"])
            for o in q["options"]:
                self.assertTrue(o["label_en"], (q["id"], o["id"]))
        for step in ENGINE.ruleset["steps"]:
            self.assertTrue(step["title_en"] and step["subtitle_en"], step["id"])

    def test_scalp_has_a_thinning_option_and_products_carry_formula_tags(self):
        self.assertIn("thinning", {o["id"] for o in ENGINE.questions["scalp_condition"]["options"]})
        allowed = {"botanical", "salon", "eco"}
        for k, t in ENGINE.tags.items():
            self.assertLessEqual(set(t["quiz"]["formula"]), allowed, k)
        by_brand = {}
        for t in ENGINE.tags.values():
            by_brand.setdefault(t["brand"], set()).update(t["quiz"]["formula"])
        self.assertIn("botanical", by_brand["AROMATICA"])
        self.assertIn("botanical", by_brand["Rahua"])
        self.assertIn("salon", by_brand["Moroccanoil"])
        self.assertTrue(all(ENGINE.tags[k]["quiz"]["formula"] for k in ("aromatica-rosemary-scalp-scaling-shampoo-bar",)))

    def test_every_label_has_all_four_steps(self):
        for lab in ENGINE.priority:
            for sid in ("cleanse", "condition", "treat", "style_protect"):
                self.assertTrue(ENGINE.ruleset["routine"]["by_label"][lab][sid], (lab, sid))

    def test_every_product_has_a_way_into_the_quiz_except_tone_only_masks(self):
        route = ENGINE.ruleset["routine"]
        listed = {c["product"] for steps_ in route["by_label"].values() for cands in steps_.values() for c in cands}
        listed |= {c["product"] for cands in route["addons_by_label"].values() for c in cands}
        self.assertEqual(set(ENGINE.tags) - listed, TONE_ONLY)

    def test_broken_config_is_rejected(self):
        rs = copy.deepcopy(ENGINE.ruleset)
        rs["rules"][0]["when"]["value"] = "khong_ton_tai"
        tags = {"products": list(ENGINE.tags.values())}
        with self.assertRaises(RulesetError):
            HairRoutineEngine(rs, tags)
        rs = copy.deepcopy(ENGINE.ruleset)
        rs["routine"]["by_label"]["Repair"]["cleanse"][0]["product"] = "san-pham-ma"
        with self.assertRaises(RulesetError):
            HairRoutineEngine(rs, tags)
        rs = copy.deepcopy(ENGINE.ruleset)
        rs["labels"]["goal_to_label"]["repair"] = "Nhan-la"
        with self.assertRaises(RulesetError):
            HairRoutineEngine(rs, tags)
        rs = copy.deepcopy(ENGINE.ruleset)
        rs["routine"]["by_label"]["Repair"]["treat"].insert(0, {"product": "moisture-repair-shampoo"})   # sai bước
        with self.assertRaises(RulesetError):
            HairRoutineEngine(rs, tags)
        rs = copy.deepcopy(ENGINE.ruleset)
        rs["routine"]["preference"]["question"] = "primary_goal"      # câu ưu tiên phải là câu tùy chọn
        with self.assertRaises(RulesetError):
            HairRoutineEngine(rs, tags)
        bad = copy.deepcopy(list(ENGINE.tags.values()))
        bad[0]["quiz"]["formula"] = ["khong_co"]
        with self.assertRaises(RulesetError):
            HairRoutineEngine(ENGINE.ruleset, {"products": bad})

    def test_config_is_plain_json_separate_from_code(self):
        # BR-QUZ-08: ruleset mang version, không nhúng logic trong code
        self.assertEqual(ENGINE.version, "3.0.0")
        json.dumps(ENGINE.ruleset)


# ================================================================================================
class T2_Validation(unittest.TestCase):
    def test_missing_required_questions_are_reported(self):
        with self.assertRaises(QuizInputError) as cm:
            ENGINE.infer({"scalp_condition": "oily"}, stock())
        joined = " ".join(cm.exception.issues)
        for q in ("hair_damage", "hair_texture", "hair_thickness", "wash_frequency", "chemical_history", "primary_goal"):
            self.assertIn(q, joined)
        self.assertNotIn("formula_preference", joined)

    def test_formula_preference_is_optional(self):
        r = ENGINE.infer(answers(), stock())
        self.assertIn("primary_label", r)
        self.assertIn("primary_label", ENGINE.infer(answers(formula_preference="none"), stock()))
        with self.assertRaises(QuizInputError):
            ENGINE.infer(answers(formula_preference="vegan_only"), stock())

    def test_hair_thickness_is_now_required(self):
        a = answers()
        del a["hair_thickness"]
        with self.assertRaises(QuizInputError):
            ENGINE.infer(a, stock())

    def test_heat_styling_is_no_longer_a_question(self):
        with self.assertRaises(QuizInputError):
            ENGINE.infer(answers(heat_styling="often"), stock())

    def test_unknown_option_or_question_rejected(self):
        with self.assertRaises(QuizInputError):
            ENGINE.infer(answers(scalp_condition="rat_dau"), stock())
        with self.assertRaises(QuizInputError):
            ENGINE.infer({**answers(), "cau_hoi_la": "x"}, stock())
        with self.assertRaises(QuizInputError):
            ENGINE.infer(None, stock())

    def test_multi_select_rejects_non_sequences_and_unhashable_values(self):
        for value in (42, [["dyed"]]):
            with self.subTest(value=value), self.assertRaises(QuizInputError):
                ENGINE.infer(answers(chemical_history=value), stock())

    def test_none_option_is_exclusive(self):
        with self.assertRaises(QuizInputError):
            ENGINE.infer(answers(chemical_history=["none", "dyed"]), stock())

    def test_multi_select_order_and_duplicates_do_not_matter(self):
        a = ENGINE.infer(answers(chemical_history=["dyed", "bleached"]), stock())
        b = ENGINE.infer(answers(chemical_history=["bleached", "dyed", "dyed"]), stock())
        self.assertEqual(a, b)


# ================================================================================================
class T3_RulesAndGoal(unittest.TestCase):
    def test_goal_decides_the_primary_label_others_follow_by_priority(self):
        # tóc hư tổn + da đầu dầu + nhuộm + xoăn, nhưng mục tiêu là tăng phồng -> nhãn chính là Volume
        r = ENGINE.infer(answers(scalp_condition="oily", hair_damage="damaged", hair_texture="curly",
                                 hair_thickness="medium", wash_frequency="daily", chemical_history=["dyed"],
                                 primary_goal="volume"), stock())
        self.assertEqual(r["primary_label"], "Volume")
        self.assertEqual(r["secondary_label"], "Repair")
        self.assertEqual(r["active_labels"], ["Volume", "Repair", "Scalp", "Color", "Curl", "Hydration"])

    def test_when_the_goal_rule_did_not_fire_the_priority_order_decides(self):
        # mục tiêu "định hình xoăn" với tóc thẳng không khớp luật nào của nó: Repair > Scalp > ...
        r = ENGINE.infer(answers(scalp_condition="oily", hair_damage="damaged", primary_goal="define_curls"), stock())
        self.assertEqual((r["primary_label"], r["secondary_label"]), ("Repair", "Scalp"))

    def test_a_goal_whose_rule_did_not_fire_does_not_change_the_order(self):
        # mục tiêu "định hình xoăn" nhưng tóc thẳng -> không có luật Curl, thứ tự ưu tiên giữ nguyên
        r = ENGINE.infer(answers(scalp_condition="oily", hair_texture="straight", primary_goal="define_curls"), stock())
        self.assertEqual(r["primary_label"], "Scalp")
        self.assertNotIn("Curl", r["active_labels"])

    def test_each_goal_with_a_label_makes_it_primary(self):
        expect = {"repair": "Repair", "scalp_care": "Scalp", "color_protect": "Color", "hydrate": "Hydration",
                  "volume": "Volume", "smooth_style": "Styling"}
        for goal, lab in expect.items():
            r = ENGINE.infer(answers(hair_damage="damaged", scalp_condition="oily", primary_goal=goal), stock())
            self.assertEqual(r["primary_label"], lab, goal)

    def test_bleached_damaged_hair_is_repaired_with_the_blonde_line(self):
        r = ENGINE.infer(answers(hair_damage="damaged", chemical_history=["bleached"], hair_thickness="medium",
                                 primary_goal="repair"), stock())
        self.assertEqual((r["primary_label"], r["secondary_label"]), ("Repair", "Color"))
        self.assertEqual(steps(r)["cleanse"], "davines-heart-of-glass-silkening-chelating-shampoo")
        self.assertEqual(steps(r)["condition"], "davines-heart-of-glass-rich-conditioner")
        self.assertEqual(steps(r)["treat"], "davines-heart-of-glass-instant-bonding-glow")
        self.assertEqual(r["addon"]["product"]["key"], "platinum-color-depositing-mask")

    def test_bleached_hair_with_color_goal_gets_the_purple_shampoo(self):
        r = ENGINE.infer(answers(chemical_history=["bleached"], primary_goal="color_protect"), stock())
        self.assertEqual(r["primary_label"], "Color")
        self.assertEqual(steps(r)["cleanse"], "blonde-perfecting-purple-shampoo")
        self.assertEqual(steps(r)["condition"], "blonde-perfecting-purple-conditioner")

    def test_dyed_hair_with_color_goal_and_daily_washing(self):
        r = ENGINE.infer(answers(chemical_history=["dyed"], wash_frequency="daily", primary_goal="color_protect"), stock(color_care_shampoo=20))
        self.assertEqual((r["primary_label"], r["secondary_label"]), ("Color", "Hydration"))
        self.assertEqual(steps(r)["cleanse"], "color-care-shampoo")
        self.assertEqual(steps(r)["condition"], "color-care-conditioner")

    def test_curly_thick_dry_hair_gets_the_curl_routine_from_three_houses(self):
        r = ENGINE.infer(answers(hair_texture="curly", hair_thickness="thick", hair_damage="dry_frizzy",
                                 primary_goal="define_curls"), stock())
        self.assertEqual(r["primary_label"], "Curl")
        self.assertEqual(steps(r), {"cleanse": "davines-love-curl-co-wash", "condition": "rahua-hydration-conditioner",
                                    "treat": "rahua-hydration-hair-mask",
                                    "style_protect": "rahua-enchanted-islandtm-vegan-curl-butter"})

    def test_wavy_only_counts_as_curl_when_goal_is_define_curls(self):
        self.assertEqual(ENGINE.infer(answers(hair_texture="wavy", primary_goal="hydrate"), stock())["primary_label"], "Hydration")
        r = ENGINE.infer(answers(hair_texture="wavy", primary_goal="define_curls"), stock())
        self.assertEqual(r["primary_label"], "Curl")
        self.assertEqual(steps(r)["cleanse"], "hydrating-shampoo")

    def test_scalp_rules_each_condition(self):
        for sc in ("oily", "dry_sensitive", "flaky"):
            self.assertEqual(ENGINE.infer(answers(scalp_condition=sc), stock())["primary_label"], "Scalp", sc)

    def test_each_scalp_type_gets_its_own_shampoo(self):
        expect = {"oily": "aromatica-tea-tree-purifying-shampoo", "dry_sensitive": "rahua-aloe-vera-shampoo",
                  "flaky": "davines-purifying-shampoo", "normal": "scalp-balancing-shampoo"}
        for sc, key in expect.items():
            r = ENGINE.infer(answers(scalp_condition=sc, primary_goal="scalp_care"), stock())
            self.assertEqual(steps(r)["cleanse"], key, sc)

    def test_thinning_scalp_gets_the_rosemary_and_energizing_line(self):
        r = ENGINE.infer(answers(scalp_condition="thinning"), stock())
        self.assertIn("R-SCA-04", [m["id"] for m in r["matched_rules"]])
        self.assertEqual(r["primary_label"], "Scalp")
        self.assertEqual(steps(r), {"cleanse": "davines-energizing-shampoo",
                                    "condition": "aromatica-rosemary-hair-thickening-conditioner",
                                    "treat": "aromatica-rosemary-pdrn-scalp-serum",
                                    "style_protect": "rahua-hydration-detangler-uv-barrier"})
        daily = ENGINE.infer(answers(scalp_condition="thinning", wash_frequency="daily"), stock())
        self.assertEqual(steps(daily)["style_protect"], "davines-this-is-an-invisible-dry-shampoo")

    def test_smooth_and_style_picks_texture_and_hold_by_texture_and_thickness(self):
        expect = {("straight", "fine"): "dry-texture-spray", ("straight", "medium"): "davines-this-is-a-dry-texturizer",
                  ("straight", "thick"): "molding-cream", ("wavy", "fine"): "davines-this-is-a-sea-salt-spray",
                  ("wavy", "medium"): "texture-clay", ("wavy", "thick"): "rahua-freestyle-texturizer",
                  ("curly", "fine"): "luminous-hairspray-strong", ("curly", "medium"): "rahua-cream-wax",
                  ("curly", "thick"): "sculpting-pomade"}
        for (tex, thick), key in expect.items():
            r = ENGINE.infer(answers(hair_texture=tex, hair_thickness=thick, primary_goal="smooth_style"), stock())
            self.assertEqual(r["primary_label"], "Styling")
            self.assertEqual(steps(r)["style_protect"], key, (tex, thick))

    def test_smooth_and_style_on_damaged_hair_smooths_instead_of_texturising(self):
        r = ENGINE.infer(answers(hair_damage="damaged", primary_goal="smooth_style"), stock())
        self.assertEqual(steps(r)["style_protect"], "frizz-shield-spray")

    def test_fine_hair_gets_light_formulas(self):
        r = ENGINE.infer(answers(hair_damage="dry_frizzy", hair_thickness="fine"), stock())
        self.assertEqual(r["primary_label"], "Hydration")
        self.assertEqual(steps(r)["treat"], "weightless-hydrating-mask")
        r = ENGINE.infer(answers(hair_thickness="fine", primary_goal="volume"), stock())
        self.assertEqual(steps(r)["style_protect"], "root-boost")

    def test_matched_rules_are_explained(self):
        r = ENGINE.infer(answers(hair_damage="damaged"), stock())
        self.assertIn("R-REP-01", [m["id"] for m in r["matched_rules"]])
        self.assertTrue(all(m["description"] for m in r["matched_rules"]))


# ================================================================================================
class T4_RoutineStructure(unittest.TestCase):
    def test_four_steps_in_fixed_order_and_one_product_per_step(self):
        r = ENGINE.infer(answers(hair_damage="damaged"), stock())
        self.assertEqual([i["step_id"] for i in r["routine"]], ["cleanse", "condition", "treat", "style_protect"])
        self.assertEqual([i["step_order"] for i in r["routine"]], [1, 2, 3, 4])
        cats = {i["step_id"]: ENGINE.tags[i["product"]["key"]]["quiz"]["step"] for i in r["routine"]}
        self.assertEqual(cats, {s: s for s in cats})

    def test_routine_can_mix_the_four_houses(self):
        r = ENGINE.infer(answers(hair_texture="curly", hair_thickness="thick", hair_damage="dry_frizzy",
                                 primary_goal="define_curls"), stock())
        houses = {ENGINE.tags[k]["brand"] for k in steps(r).values()}
        self.assertGreaterEqual(len(houses), 2)

    def test_addon_never_duplicates_routine_product(self):
        # nhãn chính Repair + nhãn phụ Hydration; add-on đầu tiên đủ điều kiện không được trùng sản phẩm trong routine
        r = ENGINE.infer(answers(hair_damage="damaged", hair_thickness="thick", hair_texture="curly", primary_goal="repair"), stock())
        keys = set(steps(r).values())
        self.assertTrue(r["addon"])
        self.assertNotIn(r["addon"]["product"]["key"], keys)

    def test_addon_comes_from_the_secondary_label_and_skips_to_the_next_when_out_of_stock(self):
        a = answers(scalp_condition="oily", hair_thickness="fine", wash_frequency="daily", primary_goal="volume")
        r = ENGINE.infer(a, stock())
        self.assertEqual((r["primary_label"], r["secondary_label"]), ("Volume", "Scalp"))
        first = r["addon"]["product"]["key"]
        self.assertEqual(first, "aromatica-tea-tree-purifying-tonic")
        again = ENGINE.infer(a, stock(**{first: 0}))
        self.assertNotEqual(again["addon"]["product"]["key"], first)
        self.assertEqual(again["addon"]["label"], "Scalp")

    def test_addon_respects_scalp_compatibility(self):
        # tonic cho da đầu dầu không được gợi ý cho da đầu khô/nhạy cảm
        r = ENGINE.infer(answers(scalp_condition="dry_sensitive", hair_damage="damaged"), stock())
        self.assertEqual((r["primary_label"], r["secondary_label"]), ("Repair", "Scalp"))
        self.assertEqual(r["addon"]["product"]["key"], "rahua-scalp-skin-toner")

    def test_diagnosis_card_and_disclaimer_present(self):
        r = ENGINE.infer(answers(hair_damage="damaged"), stock())
        self.assertEqual(r["diagnosis"]["display_en"], "Repair")
        self.assertIn("do not replace professional dermatological diagnosis", r["disclaimer"]["text_en"])


# ================================================================================================
class T5_Inventory(unittest.TestCase):
    def test_out_of_stock_product_is_replaced_by_the_next_candidate(self):
        # catalog thật: Color Care Shampoo hết hàng -> ứng viên kế tiếp trong ruleset là MINU Shampoo
        r = ENGINE.infer(answers(chemical_history=["dyed"], wash_frequency="daily", primary_goal="color_protect"), stock())
        item = r["routine"][0]
        self.assertEqual(item["status"], "substituted")
        self.assertEqual(item["substituted_for"], "color-care-shampoo")
        self.assertEqual(item["product"]["key"], "davines-minu-shampoo")
        self.assertIn("tạm hết hàng", item["note"])
        self.assertIn("STEP_SUBSTITUTED", [n["code"] for n in r["notes"]])

    def test_tag_based_equivalent_when_all_explicit_candidates_are_gone(self):
        # Hydration/treat cho tóc mảnh: ứng viên khai báo gồm weightless mask > ... > intense mask; hết cả ba nhóm
        # đủ điều kiện -> lấy sản phẩm cùng bước + cùng nhãn Hydration, chuyên biệt nhất, cho phép thay thế tự động
        listed = {c["product"] for c in ENGINE.ruleset["routine"]["by_label"]["Hydration"]["treat"]}
        gone = {k: 0 for k in listed}
        r = ENGINE.infer(answers(hair_damage="dry_frizzy", hair_thickness="fine"), stock(**gone))
        item = next(i for i in r["routine"] if i["step_id"] == "treat")
        self.assertEqual(item["status"], "substituted")
        pool = [k for k, t in ENGINE.tags.items() if t["quiz"]["step"] == "treat" and "Hydration" in t["quiz"]["needs"]
                and t["allow_auto_substitute"] and k not in listed]
        self.assertIn(item["product"]["key"], pool)
        self.assertEqual(len(ENGINE.tags[item["product"]["key"]]["quiz"]["needs"]), min(len(ENGINE.tags[k]["quiz"]["needs"]) for k in pool))

    def test_purple_and_tone_products_are_never_used_as_substitutes(self):
        # tóc nhuộm thường: nếu mọi ứng viên Color/cleanse hết hàng -> bỏ bước, không lấy dòng tím (chỉ cho tóc tẩy)
        listed = [c["product"] for c in ENGINE.ruleset["routine"]["by_label"]["Color"]["cleanse"]]
        r = ENGINE.infer(answers(chemical_history=["dyed"], primary_goal="color_protect"), stock(**{k: 0 for k in listed}))
        item = r["routine"][0]
        self.assertNotIn(item["product"] and item["product"]["key"], {"blonde-perfecting-purple-shampoo"})
        no_auto = {k for k, t in ENGINE.tags.items() if not t["allow_auto_substitute"]}
        self.assertTrue(TONE_ONLY <= no_auto)
        self.assertTrue({"blonde-perfecting-purple-shampoo", "davines-heart-of-glass-silkening-chelating-shampoo"} <= no_auto)

    def test_step_is_skipped_with_note_when_nothing_can_replace_it(self):
        everything = {k: 0 for k, t in ENGINE.tags.items() if t["quiz"]["step"] == "condition"}
        r = ENGINE.infer(answers(scalp_condition="oily"), stock(**everything))
        item = next(i for i in r["routine"] if i["step_id"] == "condition")
        self.assertEqual((item["status"], item["product"], item["reason"]), ("skipped", None, "out_of_stock"))
        self.assertIn("Rebalance Conditioner", item["note"])
        self.assertIn("STEP_SKIPPED_OUT_OF_STOCK", [n["code"] for n in r["notes"]])
        self.assertTrue(r["meets_min_steps"])          # vẫn còn 3 bước

    def test_inactive_product_is_never_recommended(self):
        r = ENGINE.infer(answers(hair_damage="dry_frizzy"), stock(davines_momo_shampoo=None))
        self.assertNotEqual(steps(r)["cleanse"], "davines-momo-shampoo")
        self.assertEqual(r["routine"][0]["status"], "substituted")

    def test_available_must_be_strictly_greater_than_zero(self):
        a = answers(hair_damage="dry_frizzy")
        self.assertEqual(steps(ENGINE.infer(a, stock(davines_momo_shampoo=1)))["cleanse"], "davines-momo-shampoo")
        self.assertNotEqual(steps(ENGINE.infer(a, stock(davines_momo_shampoo=0)))["cleanse"], "davines-momo-shampoo")

    def test_product_missing_from_inventory_is_treated_as_unavailable(self):
        r = ENGINE.infer(answers(hair_damage="dry_frizzy"), all_out_except("hydrating-conditioner"))
        self.assertEqual(steps(r)["condition"], "hydrating-conditioner")
        self.assertIsNone(steps(r)["cleanse"])

    def test_inventory_provider_can_supply_live_active_and_available(self):
        disabled_id = PID["hydrating-shampoo"]
        engine = HairRoutineEngine.from_files(
            inventory_provider=lambda product_id: {
                "active": product_id != disabled_id,
                "available": 10,
            }
        )
        result = engine.recommend(answers(), log_event=False)
        recommended_ids = {
            item["product"]["product_id"]
            for item in result["routine"]
            if item["product"]
        }
        self.assertNotIn(disabled_id, recommended_ids)

    def test_invalid_inventory_is_reported(self):
        for available in (True, "5", float("inf")):
            inventory = stock(hydrating_shampoo=5)
            inventory[PID["hydrating-shampoo"]]["available"] = available
            with self.subTest(available=available), self.assertRaises(ValueError):
                ENGINE.infer(answers(), inventory)

    def test_less_than_three_steps_is_flagged_not_crashed(self):
        r = ENGINE.infer(answers(hair_damage="dry_frizzy"), all_out_except("hydrating-shampoo", "hydrating-conditioner"))
        self.assertFalse(r["meets_min_steps"])
        self.assertIn("MIN_STEPS_NOT_MET", [n["code"] for n in r["notes"]])
        self.assertEqual(sum(1 for i in r["routine"] if i["product"]), 2)

    def test_everything_out_of_stock_still_returns_a_result(self):
        r = ENGINE.infer(answers(hair_damage="damaged"), {})
        self.assertEqual(r["primary_label"], "Repair")
        self.assertTrue(all(i["status"] == "skipped" for i in r["routine"]))
        self.assertIsNone(r["addon"])

    def test_color_depositing_masks_and_hold_products_are_never_auto_substitutes(self):
        no_auto = {k for k, t in ENGINE.tags.items() if not t["allow_auto_substitute"]}
        self.assertTrue({"cocoa-color-depositing-mask", "sculpting-pomade", "luminous-hairspray-strong",
                         "rahua-cream-wax", "davines-this-is-a-dry-texturizer"} <= no_auto)


# ================================================================================================
class T6_Fallback(unittest.TestCase):
    def test_no_rule_matches_returns_hydrating_default(self):
        r = ENGINE.infer(answers(), stock())
        self.assertTrue(r["fallback_used"])
        self.assertEqual((r["primary_label"], r["secondary_label"]), ("Hydration", None))
        self.assertEqual(r["matched_rules"][0]["id"], "R-DEFAULT")
        self.assertIn("FALLBACK", [n["code"] for n in r["notes"]])
        self.assertEqual(steps(r)["cleanse"], "hydrating-shampoo")
        self.assertEqual(sum(1 for i in r["routine"] if i["product"]), 4)

    def test_real_hydration_is_not_marked_as_fallback(self):
        r = ENGINE.infer(answers(primary_goal="hydrate"), stock())
        self.assertFalse(r["fallback_used"])

    def test_fallback_still_works_when_stock_is_low(self):
        r = ENGINE.infer(answers(), stock(hydrating_shampoo=0))
        self.assertEqual(r["primary_label"], "Hydration")


# ================================================================================================
class T7_Determinism(unittest.TestCase):
    CASE = dict(scalp_condition="oily", hair_damage="damaged", hair_texture="curly", hair_thickness="fine",
                wash_frequency="daily", chemical_history=["permed", "bleached", "dyed"], formula_preference="botanical",
                primary_goal="volume")

    def test_same_input_same_output_many_times(self):
        first = json.dumps(ENGINE.infer(self.CASE, stock()), sort_keys=True)
        for _ in range(200):
            self.assertEqual(json.dumps(ENGINE.infer(self.CASE, stock()), sort_keys=True), first)

    def test_key_order_of_answers_and_inventory_is_irrelevant(self):
        rnd = random.Random(7)
        base = json.dumps(ENGINE.infer(self.CASE, stock()), sort_keys=True)
        for _ in range(50):
            items = list(self.CASE.items()); rnd.shuffle(items)
            inv_items = list(stock().items()); rnd.shuffle(inv_items)
            self.assertEqual(json.dumps(ENGINE.infer(dict(items), dict(inv_items)), sort_keys=True), base)

    def test_fresh_engine_instance_gives_same_result(self):
        other = HairRoutineEngine.from_files()
        self.assertEqual(other.infer(self.CASE, stock()), ENGINE.infer(self.CASE, stock()))

    def test_infer_does_not_mutate_inputs(self):
        a, inv = copy.deepcopy(self.CASE), stock()
        a0, inv0 = copy.deepcopy(a), copy.deepcopy(inv)
        ENGINE.infer(a, inv)
        self.assertEqual((a, inv), (a0, inv0))

    def test_result_is_independent_of_clock(self):
        sink = ListEventSink()
        r1 = ENGINE.run_quiz(self.CASE, stock(), sink, dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc))
        r2 = ENGINE.run_quiz(self.CASE, stock(), sink, dt.datetime(2030, 6, 6, tzinfo=dt.timezone.utc))
        self.assertEqual(r1, r2)


# ================================================================================================
class T8_QuizEvent(unittest.TestCase):
    NOW = dt.datetime(2026, 10, 29, 8, 22, 4, tzinfo=dt.timezone.utc)

    def test_event_has_exactly_time_labels_and_version(self):
        sink = ListEventSink()
        ENGINE.run_quiz(answers(scalp_condition="oily", hair_thickness="fine", primary_goal="volume"), stock(), sink, self.NOW)
        self.assertEqual(sink.events, [{"timestamp": "2026-10-29T08:22:04Z", "primary_label": "Volume",
                                        "secondary_label": "Scalp", "ruleset_version": "3.0.0"}])

    def test_event_is_anonymous_no_answers_or_identifiers(self):
        sink = ListEventSink()
        ENGINE.run_quiz(answers(chemical_history=["bleached"]), stock(), sink, self.NOW)
        self.assertEqual(set(sink.events[0]), {"timestamp", "primary_label", "secondary_label", "ruleset_version"})
        blob = json.dumps(sink.events[0])
        for leak in ("bleached", "oily", "user", "email", "ip"):
            self.assertNotIn(leak, blob)

    def test_secondary_label_is_null_when_absent_and_fallback_is_logged(self):
        sink = ListEventSink()
        ENGINE.run_quiz(answers(), stock(), sink, self.NOW)
        self.assertEqual((sink.events[0]["primary_label"], sink.events[0]["secondary_label"]), ("Hydration", None))

    def test_one_event_per_completed_quiz_and_none_for_invalid_input(self):
        sink = ListEventSink()
        for _ in range(3):
            ENGINE.run_quiz(answers(), stock(), sink, self.NOW)
        with self.assertRaises(QuizInputError):
            ENGINE.run_quiz({"scalp_condition": "oily"}, stock(), sink, self.NOW)
        self.assertEqual(len(sink.events), 3)

    def test_naive_and_non_utc_datetimes_are_normalised_to_utc_z(self):
        vn = dt.timezone(dt.timedelta(hours=7))
        e = build_quiz_event({"primary_label": "Color", "secondary_label": None, "ruleset_version": "3.0.0"},
                             dt.datetime(2026, 10, 29, 15, 22, 4, tzinfo=vn))
        self.assertEqual(e["timestamp"], "2026-10-29T08:22:04Z")

    def test_jsonl_sink_appends_one_line_per_event(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "quiz_events.jsonl"
            sink = JsonlEventSink(p)
            ENGINE.run_quiz(answers(hair_damage="damaged"), stock(), sink, self.NOW)
            ENGINE.run_quiz(answers(), stock(), sink, self.NOW)
            lines = p.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), 2)
            self.assertEqual(json.loads(lines[0])["primary_label"], "Repair")

    def test_sqlite_sink_logs_only_anonymous_event_fields(self):
        with tempfile.TemporaryDirectory() as d:
            engine = HairRoutineEngine(event_db=Path(d) / "events.sqlite3")
            result = engine.recommend(answers(hair_damage="damaged"))
            with closing(sqlite3.connect(engine.event_db)) as con:
                row = con.execute(
                    "SELECT occurred_at, primary_label, secondary_label, ruleset_version, matched_rule_ids "
                    "FROM Quiz_Event"
                ).fetchone()
            self.assertIsNotNone(row)
            self.assertTrue(row[0])
            self.assertEqual(row[1], result["primary_label"])
            self.assertEqual(row[2], result["secondary_label"])
            self.assertEqual(row[3], ENGINE.version)
            self.assertTrue(json.loads(row[4]))
            self.assertNotIn("hair_damage", row[4])

    def test_recommend_preserves_legacy_result_fields(self):
        result = ENGINE.recommend(answers(hair_damage="damaged"), log_event=False)
        self.assertIn("matched_rule_ids", result)
        self.assertIn("optional_addon", result)
        self.assertEqual(len(result["routine"]), 4)
        self.assertEqual(result["routine"][0]["step"], "Cleanse")


# ================================================================================================
class T9_FormulaPreference(unittest.TestCase):
    CASES = [dict(scalp_condition="normal", hair_damage="damaged", hair_texture="straight", hair_thickness="fine",
                  wash_frequency="daily", chemical_history=["dyed"], primary_goal="repair"),
             dict(scalp_condition="oily", hair_damage="healthy", hair_texture="curly", hair_thickness="thick",
                  wash_frequency="weekly", chemical_history=["none"], primary_goal="hydrate"),
             dict(scalp_condition="thinning", hair_damage="dry_frizzy", hair_texture="wavy", hair_thickness="medium",
                  wash_frequency="every_2_3_days", chemical_history=["bleached"], primary_goal="color_protect")]

    def tag_count(self, result, tag):
        keys = [i["product"]["key"] for i in result["routine"] if i["product"]]
        return sum(tag in ENGINE.tags[k]["quiz"]["formula"] for k in keys)

    def test_preference_never_changes_labels_or_removes_steps(self):
        for a in self.CASES:
            base = ENGINE.infer(a, stock())
            for pref in ("none", "botanical", "salon", "eco"):
                r = ENGINE.infer({**a, "formula_preference": pref}, stock())
                self.assertEqual((r["primary_label"], r["secondary_label"], r["active_labels"]),
                                 (base["primary_label"], base["secondary_label"], base["active_labels"]))
                self.assertEqual([i["status"] != "skipped" for i in r["routine"]], [i["status"] != "skipped" for i in base["routine"]])

    def test_none_is_the_same_as_unanswered(self):
        for a in self.CASES:
            self.assertEqual(ENGINE.infer({**a, "formula_preference": "none"}, stock()), ENGINE.infer(a, stock()))

    def test_a_preference_never_lowers_the_number_of_matching_products(self):
        for a in self.CASES:
            for pref in ("botanical", "salon", "eco"):
                self.assertGreaterEqual(self.tag_count(ENGINE.infer({**a, "formula_preference": pref}, stock()), pref),
                                        self.tag_count(ENGINE.infer(a, stock()), pref), (a, pref))

    def test_botanical_moves_the_scalp_routine_to_the_plant_based_lines(self):
        a = dict(scalp_condition="normal", hair_damage="healthy", hair_texture="straight", hair_thickness="fine",
                 wash_frequency="every_2_3_days", chemical_history=["none"], primary_goal="scalp_care")
        plain = ENGINE.infer(a, stock())
        botanical = ENGINE.infer({**a, "formula_preference": "botanical"}, stock())
        self.assertEqual(steps(plain)["cleanse"], "davines-energizing-shampoo")
        self.assertEqual(ENGINE.tags[steps(botanical)["cleanse"]]["brand"] in ("AROMATICA", "Rahua"), True)

    def test_preferred_product_is_still_an_eligible_candidate(self):
        """The preference reorders the declared candidates; the picked product is always one the ruleset lists for that step."""
        for a in self.CASES:
            for pref in ("botanical", "salon", "eco"):
                r = ENGINE.infer({**a, "formula_preference": pref}, stock())
                for i in r["routine"]:
                    if i["status"] == "ok":
                        listed = {c["product"] for c in ENGINE.ruleset["routine"]["by_label"][r["primary_label"]][i["step_id"]]}
                        self.assertIn(i["product"]["key"], listed)


# ================================================================================================
class T10_Exhaustive(unittest.TestCase):
    """Duyệt TOÀN BỘ tổ hợp đáp án hợp lệ (113.400 bộ) và kiểm tra các bất biến của hệ thống."""

    def _all_answers(self):
        qs = ENGINE.questions
        single = lambda q, opt=False: [o["id"] for o in qs[q]["options"]] + ([None] if opt else [])
        chem = [["none"]] + [list(c) for n in (1, 2, 3)
                             for c in itertools.combinations(["dyed", "bleached", "permed"], n)]
        for sc, dm, tx, th, wf, ch, fp, gl in itertools.product(
                single("scalp_condition"), single("hair_damage"), single("hair_texture"),
                single("hair_thickness"), single("wash_frequency"), chem,
                single("formula_preference", True), single("primary_goal")):
            a = dict(scalp_condition=sc, hair_damage=dm, hair_texture=tx, hair_thickness=th, wash_frequency=wf,
                     chemical_history=ch, primary_goal=gl)
            if fp: a["formula_preference"] = fp
            yield a

    def test_invariants_over_all_combinations(self):
        inv = stock()
        in_stock = {PID[k] for k in PID if k != "color-care-shampoo"}
        prio = ENGINE.rank
        n = fallback = 0
        primaries = set()
        for a in self._all_answers():
            r = ENGINE.infer(a, inv)                      # không bao giờ được văng lỗi (không có trang trắng)
            n += 1
            # nhãn: mục tiêu quyết định nhãn chính khi luật của nó khớp, nhãn phụ là nhãn kế tiếp theo ưu tiên
            self.assertIn(r["primary_label"], prio)
            goal_label = ENGINE.goal_to_label.get(a["primary_goal"])
            fired = {m["label"] for m in r["matched_rules"]}
            if goal_label in fired and not r["fallback_used"]:
                self.assertEqual(r["primary_label"], goal_label, a)
            rest = r["active_labels"][1:]
            self.assertEqual(rest, sorted(rest, key=prio.__getitem__))
            self.assertEqual(r["secondary_label"], rest[0] if rest else None)
            self.assertEqual(r["fallback_used"], r["matched_rules"][0]["id"] == "R-DEFAULT")
            fallback += r["fallback_used"]
            primaries.add(r["primary_label"])
            # routine
            self.assertEqual([i["step_id"] for i in r["routine"]], ["cleanse", "condition", "treat", "style_protect"])
            prods = [i["product"]["key"] for i in r["routine"] if i["product"]]
            self.assertEqual(len(prods), len(set(prods)))
            # add-on: tối đa 1, không trùng routine, chỉ khi có nhãn phụ
            if r["addon"]:
                self.assertIsNotNone(r["secondary_label"])
                self.assertEqual(r["addon"]["label"], r["secondary_label"])
                self.assertNotIn(r["addon"]["product"]["key"], prods)
                prods.append(r["addon"]["product"]["key"])
            # tồn kho + da đầu
            for k in prods:
                self.assertIn(PID[k], in_stock)
                s = ENGINE.tags[k]["quiz"]["scalp"]
                self.assertTrue("all" in s or a["scalp_condition"] in s, (k, a))
            # bước skipped luôn có ghi chú; bước có sản phẩm thì đúng loại bước
            for i in r["routine"]:
                if i["status"] == "skipped":
                    self.assertTrue(i["note"])
                else:
                    self.assertEqual(ENGINE.tags[i["product"]["key"]]["quiz"]["step"], i["step_id"])
            self.assertTrue(r["meets_min_steps"], a)
        self.assertEqual(n, 5 * 3 * 3 * 3 * 3 * 8 * 5 * 7)
        self.assertGreater(fallback, 0)
        self.assertEqual(primaries, set(ENGINE.priority))       # đủ 7 nhãn đều có thể là nhãn chính

    def test_all_150_products_can_be_recommended_except_the_tone_only_masks(self):
        """Với tồn kho đầy đủ, mọi sản phẩm (trừ 5 mặt nạ phủ màu theo tông) xuất hiện trong ít nhất một kết quả."""
        inv = {pid: {"active": True, "available": 20} for pid in PID.values()}
        seen = set()
        for a in self._all_answers():
            r = ENGINE.infer(a, inv)
            seen |= {i["product"]["key"] for i in r["routine"] if i["product"]}
            if r["addon"]:
                seen.add(r["addon"]["product"]["key"])
        self.assertEqual(set(ENGINE.tags) - seen, TONE_ONLY)

    def test_every_house_appears_in_every_label(self):
        """Không nhãn nào chỉ gợi ý sản phẩm của một thương hiệu."""
        inv = {pid: {"active": True, "available": 20} for pid in PID.values()}
        houses = {lab: set() for lab in ENGINE.priority}
        for a in self._all_answers():
            r = ENGINE.infer(a, inv)
            houses[r["primary_label"]] |= {ENGINE.tags[i["product"]["key"]]["brand"] for i in r["routine"] if i["product"]}
        for lab, found in houses.items():
            self.assertGreaterEqual(len(found), 3, (lab, found))

    def test_never_crashes_with_random_inventory(self):
        rnd = random.Random(2026)
        combos = list(self._all_answers())
        for _ in range(300):
            a = rnd.choice(combos)
            inv = {pid: {"active": rnd.random() > 0.1, "available": rnd.choice([0, 0, 1, 5])} for pid in PID.values()}
            r = ENGINE.infer(a, inv)
            for i in r["routine"]:
                if i["product"]:
                    rec = inv[i["product"]["product_id"]]
                    self.assertTrue(rec["active"] and rec["available"] > 0)
            if r["addon"]:
                rec = inv[r["addon"]["product"]["product_id"]]
                self.assertTrue(rec["active"] and rec["available"] > 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
