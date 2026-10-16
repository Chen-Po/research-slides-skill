import os, sys
sys.path.insert(0, os.environ["RESEARCH_SLIDES"])
from omml_lib import *

# PIP_j = 1 - prod_l (1 - alpha_lj)
EQS["pip"] = lambda: omath(
    ssub(r("PIP"), r("j")), r(" = 1 − "),
    nary(r("l"), delim(r("1 − ") + ssub(r("α"), r("lj"))), "∏"),
)
EQ_SIZE = {"pip": 1600}

if __name__ == "__main__":
    main(EQS, EQ_SIZE)
