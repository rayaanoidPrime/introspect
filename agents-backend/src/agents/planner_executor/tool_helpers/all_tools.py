# this is where you can import your custom tools
# create a folder insider toolboxes and add your tools (aka python functions) there inside a tools.py file
# and finally add all your tools in the tools array below in the given format
from ..toolboxes.data_fetching.tools import *
from ..toolboxes.stats.tools import *
from ..toolboxes.cancer_survival.tools import *
from ..toolboxes.plots.tools import *

import inspect

tools = [
    {
        "name": "data_fetcher_and_aggregator",
        "display_name": "Fetch data from database",
        "fn": data_fetcher_and_aggregator,
        "no_code": True,
        "toolbox": "data_fetching",
    },
    {
        "name": "global_dict_data_fetcher_and_aggregator",
        "display_name": "Query data from a pandas dataframe",
        "fn": global_dict_data_fetcher_and_aggregator,
        "no_code": True,
        "toolbox": "data_fetching",
    },
    {
        "name": "kaplan_meier_curve",
        "display_name": "Kaplan Meier Curve",
        "fn": kaplan_meier_curve,
        "toolbox": "cancer_survival",
    },
    {
        "name": "hazard_ratio",
        "display_name": "Hazard Ratio",
        "fn": hazard_ratio,
        "toolbox": "cancer_survival",
    },
    {
        "name": "dataset_metadata_describer",
        "display_name": "Dataset Metadata Describer",
        "fn": dataset_metadata_describer,
        "toolbox": "stats",
    },
    {
        "name": "t_test",
        "display_name": "T Test",
        "fn": t_test,
        "toolbox": "stats",
    },
    {
        "name": "fold_change",
        "display_name": "Fold Change",
        "fn": fold_change,
        "toolbox": "stats",
    },
    {
        "name": "anova_test",
        "display_name": "ANOVA Test",
        "fn": anova_test,
        "toolbox": "stats",
    },
    {
        "name": "wilcoxon_test",
        "display_name": "Wilcoxon Test",
        "fn": wilcoxon_test,
        "toolbox": "stats",
    },
    {
        "name": "line_plot",
        "display_name": "Line Plot",
        "fn": line_plot,
        "toolbox": "plots",
    },
    {
        "name": "boxplot",
        "display_name": "Boxplot",
        "fn": boxplot,
        "toolbox": "plots",
    },
    {
        "name": "heatmap",
        "display_name": "Heatmap",
        "fn": heatmap,
        "toolbox": "plots",
    },
]

tool_name_dict = {tool["name"]: tool for tool in tools}
