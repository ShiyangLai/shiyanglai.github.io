# projects.md — listed by the `ls` command on the site.
# One project per line. Format:
#     status | name | description | optional-url
# - status: "done" (finished) or "wip" (ongoing / in progress). Anything that
#   isn't a "done"-like word is treated as ongoing.
# - description (3rd field) is optional.
# - url (4th field) is optional; if present, the name becomes a clickable link.
# - Styling in `description`:  **bold highlight**  and pixel icons.
#   Pixel icons via tokens:  :terminal:  :paper:  :trophy:  :coin:
# - Blank lines and lines starting with "#" are ignored.
#
# Example:
#     done | My Cool Paper | A **best-paper** thing | https://example.com

wip  | Visible AI Bias Helps Human Decisions Across Domains; Hidden Bias Harms Them | A **large-scale** study running multiple RCTs — one field experiment and two online experiments with **5,000+ participants**.
wip  | Personal Terminal Site | :terminal: This very website — a terminal-style portfolio built on LiveTerm. | https://github.com/ShiyangLai/shiyanglai.github.io
done | Multi-LLM Systems Exhibit Robust Semantic Collapse | We show multi-LLM systems can hardly escape **semantic convergence** at inference time — it isn't easily fixed by existing approaches, and may be an **inherent limitation** of these "exploitative" machines (as **Lovelace (1843)** and **Turing (1950)** predicted)... still needs rigorous mathematical demonstration.
