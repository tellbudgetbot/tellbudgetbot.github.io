import os
macros = dict()
for filename in os.listdir("macros"):
  with open("macros/"+filename) as f:
    macros[filename] = f.read()
for filename in os.listdir("html"):
  if filename.endswith(".html"):
    with open("html/"+filename) as f:
      html = f.read()
    for k, v in macros.items():
      html = html.replace("<?"+k+"?>",v)
    with open(filename,"w") as f:
      f.write(html)
