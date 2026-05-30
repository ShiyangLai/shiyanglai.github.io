# projects.md — backs the `ls` / `cd` / `cat` filesystem on the site.
# One project per line. Format:
#     status | id | name | description | optional-url
# - status: "done" (finished) or "wip" (ongoing). Anything not "done"-like is ongoing.
# - id: the folder name you `cd` into. KEEP IT SHORT, lowercase, no spaces
#       (this is what visitors type — and what [tab] autocompletes).
# - name + description: shown by `cat <id>/readme`. Description supports **bold highlight**.
# - url (optional): shown by `cat <id>/link` as a clickable link.
# - Blank lines and lines starting with "#" are ignored.
#
# On the site it behaves like a real shell ([tab] autocompletes folders/files):
#     ~ $ ls                 ->  ongoing/   finished/
#     ~ $ cd finished && ls  ->  collapse/
#     ~ $ cd collapse
#     ~ $ ls                 ->  readme   link
#     ~ $ cat readme         ->  the project description
#     ~ $ cat link           ->  the paper link
#
# Example:
#     done | mypaper | My Cool Paper | A **best-paper** thing. | https://example.com

wip  | bias | Visible AI Bias Helps Human Decisions Across Domains; Hidden Bias Harms Them | A **large-scale** study running multiple RCTs — one field experiment and two online experiments with **5,000+ participants**.
wip  | site | Personal Terminal Site | This very website — a terminal-style portfolio built on LiveTerm. | https://github.com/ShiyangLai/shiyanglai.github.io
done | collapse | Multi-LLM Systems Exhibit Robust Semantic Collapse | We show multi-LLM systems can hardly escape **semantic convergence** at inference time — it isn't easily fixed by existing approaches, and may be an **inherent limitation** of these "exploitative" machines (as **Lovelace (1843)** and **Turing (1950)** predicted)... still needs rigorous mathematical demonstration. | https://arxiv.org/abs/2605.17193
