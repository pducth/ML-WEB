import os
import sys
import json
import base64
import io
import tempfile
import traceback

# Configure utf-8 stdout unbuffered
sys.stdout.reconfigure(encoding='utf-8')

# Set MPLCONFIGDIR and non-interactive backend 'Agg' BEFORE importing pyplot
mpl_dir = os.path.join(tempfile.gettempdir(), 'mpl_cache')
os.makedirs(mpl_dir, exist_ok=True)
os.environ['MPLCONFIGDIR'] = mpl_dir

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

NOTEBOOK_PATH = r'c:\Users\Acer\PycharmProjects\ML-WEB\docs\EDA\EDA_haircare_demand_forecasting.ipynb'

print(f"Reading notebook: {NOTEBOOK_PATH}", flush=True)
with open(NOTEBOOK_PATH, 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Update setup cell (cell 1)
nb['cells'][1]['source'] = [
    "# ============================================================\n",
    "# SETUP — Import thư viện và cấu hình chung\n",
    "# ============================================================\n",
    "import warnings\n",
    "warnings.filterwarnings('ignore')\n",
    "\n",
    "import os\n",
    "import sys\n",
    "import tempfile\n",
    "\n",
    "# Cấu hình thư mục tạm cho Matplotlib trên Windows\n",
    "mpl_dir = os.path.join(tempfile.gettempdir(), 'mpl_cache')\n",
    "os.makedirs(mpl_dir, exist_ok=True)\n",
    "os.environ['MPLCONFIGDIR'] = mpl_dir\n",
    "\n",
    "try:\n",
    "    from IPython.display import display\n",
    "except ImportError:\n",
    "    display = print\n",
    "\n",
    "import numpy as np\n",
    "import pandas as pd\n",
    "import matplotlib.pyplot as plt\n",
    "import matplotlib.ticker as mticker\n",
    "import seaborn as sns\n",
    "from statsmodels.tsa.seasonal import STL\n",
    "from statsmodels.graphics.tsaplots import plot_acf, plot_pacf\n",
    "from sklearn.ensemble import RandomForestRegressor\n",
    "from sklearn.preprocessing import LabelEncoder\n",
    "\n",
    "# --- Style ---\n",
    "plt.rcParams.update({\n",
    "    'figure.dpi': 120,\n",
    "    'font.size': 11,\n",
    "    'axes.titlesize': 13,\n",
    "    'axes.labelsize': 11,\n",
    "    'axes.grid': True,\n",
    "    'grid.alpha': 0.3,\n",
    "})\n",
    "sns.set_theme(style='whitegrid', palette='tab10')\n",
    "\n",
    "# --- Màu sắc theo danh mục ---\n",
    "CATEGORY_COLORS = {\n",
    "    'hairstyling': '#1f77b4',\n",
    "    'shampoo':     '#ff7f0e',\n",
    "    'hairmask':    '#2ca02c',\n",
    "    'conditioner': '#d62728',\n",
    "    'treatment':   '#9467bd',\n",
    "    'dry shampoo': '#8c564b',\n",
    "}\n",
    "CATEGORY_VI = {\n",
    "    'hairstyling': 'Tạo kiểu tóc',\n",
    "    'shampoo':     'Dầu gội',\n",
    "    'hairmask':    'Ủ tóc',\n",
    "    'conditioner': 'Dầu xả',\n",
    "    'treatment':   'Dưỡng tóc',\n",
    "    'dry shampoo': 'Dầu gội khô',\n",
    "}\n",
    "\n",
    "# --- Tìm đường dẫn data linh hoạt ---\n",
    "candidate_bases = [\n",
    "    os.path.join(os.getcwd(), 'data', 'ml', 'processed'),\n",
    "    os.path.join(os.getcwd(), '..', 'data', 'ml', 'processed'),\n",
    "    os.path.join(os.path.dirname(os.getcwd()), 'data', 'ml', 'processed'),\n",
    "    r'c:\\Users\\Acer\\PycharmProjects\\ML-WEB\\data\\ml\\processed'\n",
    "]\n",
    "BASE = next((p for p in candidate_bases if os.path.exists(p)), candidate_bases[-1])\n",
    "\n",
    "SALES_PATH   = os.path.join(BASE, 'haircare_demo_daily_sales.csv')\n",
    "MAPPING_PATH = os.path.join(BASE, 'haircare_demo_product_mapping.csv')\n",
    "CATALOG_PATH = os.path.join(BASE, 'haircare_catalog_cleaned.csv')\n",
    "PROD_PATH    = os.path.join(BASE, 'eda_product_summary.csv')\n",
    "CAT_PATH     = os.path.join(BASE, 'eda_category_summary.csv')\n",
    "MONTH_PATH   = os.path.join(BASE, 'eda_monthly_summary.csv')\n",
    "\n",
    "# Tạo thư mục lưu biểu đồ\n",
    "if os.path.basename(os.getcwd()) == 'EDA':\n",
    "    FIG_DIR = os.path.join(os.getcwd(), 'figures')\n",
    "else:\n",
    "    FIG_DIR = os.path.join(os.getcwd(), 'EDA', 'figures')\n",
    "os.makedirs(FIG_DIR, exist_ok=True)\n",
    "\n",
    "print('Hoàn tất cấu hình môi trường thực nghiệm.')\n",
    "print(f'Thư mục dữ liệu: {BASE}')\n",
    "print(f'Thư mục lưu trữ biểu đồ: {FIG_DIR}')\n"
]

# Update cell 22 (Price elasticity cleanly without deprecated groupby apply)
nb['cells'][22]['source'] = [
    "# ── 4.2 Price Elasticity: Scatter Price vs Quantity ──────────\n",
    "fig, axes = plt.subplots(2, 3, figsize=(15, 9))\n",
    "\n",
    "for idx, cat in enumerate(CATEGORY_COLORS):\n",
    "    ax = axes[idx // 3][idx % 3]\n",
    "    sub = df_price[df_price['category'] == cat]\n",
    "    sub_agg = sub[['unit_price_gbp', 'quantity_sold']].dropna()\n",
    "\n",
    "    ax.scatter(sub_agg['unit_price_gbp'], sub_agg['quantity_sold'],\n",
    "               alpha=0.15, s=8, color=CATEGORY_COLORS[cat])\n",
    "\n",
    "    # Trend line\n",
    "    if len(sub_agg) > 10 and sub_agg['unit_price_gbp'].nunique() > 1:\n",
    "        z = np.polyfit(sub_agg['unit_price_gbp'], np.log1p(sub_agg['quantity_sold']), 1)\n",
    "        p = np.poly1d(z)\n",
    "        x_line = np.linspace(sub_agg['unit_price_gbp'].min(), sub_agg['unit_price_gbp'].max(), 100)\n",
    "        ax.plot(x_line, np.expm1(p(x_line)), 'r-', linewidth=1.5, alpha=0.8)\n",
    "\n",
    "    corr = sub_agg[['unit_price_gbp', 'quantity_sold']].corr().iloc[0, 1]\n",
    "    ax.set_title(f\"{cat.title()} (r={corr:.2f})\")\n",
    "    ax.set_xlabel('Unit Price (GBP)')\n",
    "    ax.set_ylabel('quantity_sold')\n",
    "\n",
    "plt.suptitle('Price Elasticity: Đơn Giá vs Doanh số theo Danh Mục', fontsize=14, y=1.01)\n",
    "plt.tight_layout()\n",
    "plt.savefig(os.path.join(FIG_DIR, '15_price_elasticity.png'), bbox_inches='tight')\n",
    "plt.show()\n"
]

# Shared global scope for execution
exec_globals = {
    '__name__': '__main__',
    'plt': plt,
}

# Custom display function to capture DataFrame outputs
def custom_display(*args):
    for a in args:
        if hasattr(a, 'to_string'):
            print(a.to_string())
        else:
            print(a)

exec_globals['display'] = custom_display

print("Bat dau thuc thi toan bo cac cell trong notebook...\n", flush=True)
execution_count = 1
errors = []

for idx, cell in enumerate(nb['cells']):
    if cell['cell_type'] != 'code':
        continue
    
    code = "".join(cell['source'])
    cell_title = cell['source'][0].strip() if cell['source'] else f"Cell {idx}"
    print(f"Thuc thi [{idx}] {cell_title[:60]}...", flush=True)
    
    # Capture stdout
    stdout_capture = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = stdout_capture
    
    # Matplotlib image capture hooks
    cell_images = []
    
    def non_blocking_show(*args, **kwargs):
        figs = [plt.figure(i) for i in plt.get_fignums()]
        for f in figs:
            buf = io.BytesIO()
            f.savefig(buf, format='png', bbox_inches='tight')
            buf.seek(0)
            img_b64 = base64.b64encode(buf.read()).decode('utf-8')
            cell_images.append(img_b64)
        plt.close('all')
    
    plt.show = non_blocking_show
    exec_globals['plt'].show = non_blocking_show
    
    exc_obj = None
    try:
        exec(code, exec_globals)
        success = True
    except Exception as ex:
        success = False
        exc_obj = ex
        tb = traceback.format_exc()
        errors.append((idx, cell_title, str(ex), tb))
    finally:
        sys.stdout = old_stdout
        plt.close('all')
    
    out_text = stdout_capture.getvalue()
    
    # Store outputs in cell
    outputs = []
    if out_text:
        outputs.append({
            "name": "stdout",
            "output_type": "stream",
            "text": [line + "\n" for line in out_text.splitlines()]
        })
    for b64 in cell_images:
        outputs.append({
            "data": {
                "image/png": b64,
                "text/plain": ["<Figure size ...>"]
            },
            "metadata": {},
            "output_type": "display_data"
        })
    
    if not success:
        outputs.append({
            "ename": type(exc_obj).__name__,
            "evalue": str(exc_obj),
            "output_type": "error",
            "traceback": tb.splitlines()
        })
        print(f"   THAT BAI: {exc_obj}", flush=True)
        print(tb, flush=True)
        break
    else:
        print(f"   THANH CONG ({len(cell_images)} plots, {len(out_text.splitlines())} text lines)", flush=True)
        cell['execution_count'] = execution_count
        cell['outputs'] = outputs
        execution_count += 1

if not errors:
    print("\nToan bo cac cell da duoc thuc thi thanh cong.", flush=True)
    print(f"Luu notebook tai: {NOTEBOOK_PATH}", flush=True)
    with open(NOTEBOOK_PATH, 'w', encoding='utf-8') as f:
        json.dump(nb, f, ensure_ascii=False, indent=1)
    print("Notebook da duoc luu voi day du ket qua va bieu do nhung truc tiep.", flush=True)
else:
    print(f"\nCo {len(errors)} loi trong qua trinh thuc thi.", flush=True)
