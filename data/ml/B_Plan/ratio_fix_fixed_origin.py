"""
Thử nghiệm "dự báo cố định mốc, nhiều tuần phía trước" trên panel 59 SKU của Online Retail II.
Mục đích: tái hiện hiện tượng dự báo thấp hơn thực tế ở Q4 2011 và so sánh cách sửa bằng
"dự báo tỷ lệ so với mức nền gần đây" (ratio-to-level) + chỉ số mùa vụ năm trước (last-year index).

Chạy:  python3 ratio_fix_fixed_origin.py retail_transactions_cleaned.csv.gz out_dir
Cần: pandas, numpy, lightgbm
"""
import sys, warnings, os
warnings.filterwarnings('ignore')
import numpy as np, pandas as pd, lightgbm as lgb

SRC = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else '.'
os.makedirs(OUT, exist_ok=True)
H = 9                       # số tuần dự báo phía trước từ mốc (origin)
ORIGINS = [d.strftime('%Y-%m-%d') for d in pd.date_range('2011-08-14', '2011-10-02', freq='W-SUN')]   # 8 mốc hàng tuần; mốc cuối = holdout Q4 2011 như biểu đồ của nhóm

# ---------- 1. Dựng lại panel 59 SKU (khớp bảng mapped_monthly_activity_audit.csv) ----------
df = pd.read_csv(SRC, encoding='utf-8-sig', dtype={'Invoice': str, 'StockCode': str}, parse_dates=['sale_date'])
svc = df.loc[df.description_is_service_or_adjustment, 'StockCode'].unique()
top = list(df[~df.StockCode.isin(svc)].groupby('StockCode').Invoice.nunique().sort_values(ascending=False).head(59).index)
p = df[df.StockCode.isin(top)].copy()
p['week'] = p.sale_date + pd.to_timedelta(6 - p.sale_date.dt.weekday, unit='D')      # tuần kết thúc Chủ nhật
# dữ liệu kết thúc Thứ Sáu 09/12/2011 lúc 12:50 -> tuần kết thúc 11/12/2011 chưa đầy đủ, bỏ ra khỏi mô hình
weeks = pd.date_range('2009-12-06', '2011-12-04', freq='W-SUN')
def wide(col):
    return p.groupby(['week', 'StockCode'])[col].sum().unstack().reindex(index=weeks, columns=top).fillna(0.0)
def to_xmas(d):
    x = pd.Timestamp(d.year, 12, 25); x = pd.Timestamp(d.year + 1, 12, 25) if d > x else x
    return (x - d).days / 7
wtx = np.array([to_xmas(d) for d in weeks]); woy = weeks.isocalendar().week.values.astype(int)

# ---------- 2. Tạo đặc trưng cho một mốc dự báo ----------
def build(T, i, season):
    A = T.values; tot = A.sum(1)
    rm4, rm8, rm13 = (A[max(0, i - k + 1):i + 1].mean(0) for k in (4, 8, 13))
    trm4, trm13 = tot[max(0, i - 3):i + 1].mean(), tot[max(0, i - 12):i + 1].mean()
    out = []
    for h in range(1, H + 1):
        j = i + h
        if j >= len(weeks): continue
        d = pd.DataFrame({'skuc': np.arange(A.shape[1]), 'h': h, 'rm4': rm4, 'rm8': rm8, 'rm13': rm13,
                          'trm4': trm4, 'trm13': trm13, 'woy': woy[j], 'wtx': wtx[j]})
        if season:
            k = j - 52
            if k < 1 or i - 64 < 0: continue
            ly = A[k - 1:k + 2].mean(0); ly_base = A[i - 64:i - 51].mean(0)      # tuần cùng kỳ năm trước / mức nền cùng thời điểm năm trước
            d['ly_idx'] = ly / (ly_base + 1e-9)
            d['tly_idx'] = tot[k - 1:k + 2].mean() / (tot[i - 64:i - 51].mean() + 1e-9)
        d['j'] = j; d['y'] = A[j]; d['wk'] = weeks[j]
        out.append(d)
    return pd.concat(out) if out else None

P = dict(n_estimators=250, learning_rate=0.05, num_leaves=15, min_child_samples=25, subsample=0.8, subsample_freq=1,
         colsample_bytree=0.8, reg_lambda=1.0, verbose=-1, n_jobs=2, random_state=7)
def fit(X, y, cols, tweedie=False):
    prm = dict(P)
    if tweedie: prm.update(objective='tweedie', tweedie_variance_power=1.3)
    return lgb.LGBMRegressor(**prm).fit(X[cols], y, categorical_feature=['skuc'])

CAL = ['skuc', 'h', 'woy', 'wtx']; LVL = ['rm4', 'rm8', 'rm13', 'trm4', 'trm13']

def run(name, T, origin):
    io = weeks.get_loc(pd.Timestamp(origin))
    tr = pd.concat([b[b.j <= io] for i in range(13, io) if (b := build(T, i, True)) is not None])
    te = build(T, io, True)
    eps = 1.0 if name == 'quantity' else 5.0
    lv_tr, lv_te = np.maximum(tr.rm13.values, eps), np.maximum(te.rm13.values, eps)
    res = te[['wk', 'h']].reset_index(drop=True); res['sku'] = np.tile(top, te.h.nunique()); res['actual'] = te.y.values
    c = CAL + LVL
    res['A_baseline_level_features'] = np.clip(fit(tr, tr.y, c).predict(te[c]), 0, None)
    res['B_tweedie'] = np.clip(fit(tr, tr.y, c, True).predict(te[c]), 0, None)
    c = CAL + ['trm4', 'trm13']
    res['C_ratio_to_level'] = np.clip(fit(tr, np.clip(tr.y / lv_tr, 0, 15), c).predict(te[c]) * lv_te, 0, None)
    c = CAL + ['trm4', 'trm13', 'ly_idx', 'tly_idx']
    res['D_ratio_plus_last_year_index'] = np.clip(fit(tr, np.clip(tr.y / lv_tr, 0, 15), c).predict(te[c]) * lv_te, 0, None)
    res['E_naive_recent_13w_mean'] = lv_te
    res['F_average_A_and_C'] = (res['A_baseline_level_features'] + res['C_ratio_to_level']) / 2
    res['target'] = name; res['origin'] = origin
    return res

frames = [run(n, wide(c), o) for n, c in [('revenue', 'revenue_source'), ('quantity', 'Quantity')] for o in ORIGINS]
r = pd.concat(frames); r.to_csv(f'{OUT}/fixed_origin_predictions.csv', index=False)

models = [c for c in r.columns if c[:2] in ('A_', 'B_', 'C_', 'D_', 'E_', 'F_')]
rows = []
for (t, o), g in r.groupby(['target', 'origin']):
    tot = g.groupby('wk')[['actual'] + models].sum()
    for m in models:
        e = g[m] - g.actual
        rows.append(dict(target=t, origin=o, model=m, sku_week_WAPE=e.abs().sum() / g.actual.sum(),
                         bias=e.sum() / g.actual.sum(), total_week_WAPE=(tot[m] - tot.actual).abs().sum() / tot.actual.sum()))
s = pd.DataFrame(rows); s.to_csv(f'{OUT}/fixed_origin_summary.csv', index=False)
pd.set_option('display.width', 220)
for t in ['revenue', 'quantity']:
    x = s[s.target == t]
    agg = x.groupby('model').agg(bias_min=('bias', 'min'), bias_median=('bias', 'median'), bias_max=('bias', 'max'),
                                 mean_abs_bias=('bias', lambda v: v.abs().mean()), total_week_WAPE=('total_week_WAPE', 'mean'),
                                 sku_week_WAPE=('sku_week_WAPE', 'mean'))
    print(f'\n===== {t}: trung bình trên {len(ORIGINS)} mốc dự báo, % (bias < 0 = dự báo thấp hơn thực tế)')
    print((agg * 100).round(1).to_string())
    agg.to_csv(f'{OUT}/robustness_across_origins_{t}.csv')
print('\nBias theo từng mốc (revenue):')
print((s[s.target == 'revenue'].pivot(index='model', columns='origin', values='bias') * 100).round(0).to_string())
