import os
import json
from acdh_tei_pyutils.tei import TeiReader
import glob
from saxonche import PySaxonProcessor

####################
# vars
####################
in_xml_dir_glob = "./data/editions/*.xml"
xsl_filepath = "./xslt/generate_snippets.xsl"
output_dir = "./html/witness_snippets"
docid_xpath = "//tei:witness[1]/@xml:id"
doc_title_xpath = "//tei:title[1]/text()"
sorting_xpath = None

###################
# checks
###################

with PySaxonProcessor(license=False) as proc:
    print(f"using {proc.version}")

os.makedirs(os.path.dirname(output_dir), exist_ok=True)

##################
# running it
##################


def get_outputfile(input_path: str, output_dir: str) -> str:
    filename = os.path.basename(input_path).removesuffix(".xml")
    return os.path.join(output_dir, filename) + ".snpt"


def get_title(doc: TeiReader):
    return doc.any_xpath(doc_title_xpath)[0].split(".")[0]


def get_uid(doc: TeiReader):
    return doc.any_xpath(docid_xpath)[0]


def get_sorting(doc: TeiReader):
    if sorting_xpath:
        return doc.any_xpath(sorting_xpath)[0]
    else:
        return doc.any_xpath(docid_xpath)[0]


def xslt(in_xml_dir_glob: list, xsl_path: str, output_dir) -> dict:
    # this dict could become a container for metadata used in json,
    # all other parts (e.g. the metadata overview for the document
    # should be prerendered to html, maybe stored as an individual
    # snippet)
    snippet_paths = {}
    with PySaxonProcessor(license=False) as proc:
        xsltproc = proc.new_xslt30_processor()
        executable = xsltproc.compile_stylesheet(stylesheet_file=xsl_path)
        for file_path in glob.glob(in_xml_dir_glob):
            print(file_path)
            document = proc.parse_xml(xml_uri=file_path)
            output_file_path = get_outputfile(file_path, output_dir)
            print(f"writing {output_file_path}")
            tei_doc = TeiReader(file_path)
            uid = get_uid(tei_doc)
            sorting = get_sorting(tei_doc)
            title = f"{get_title(tei_doc)} {uid}"
            snippet_paths[uid] = {
                "filepath": output_file_path.split("html/", 1)[1],
                "sorting": sorting,
                "title" : title
            }
            executable.transform_to_file(
                xdm_node=document, output_file=output_file_path
            )
    return snippet_paths


def log_snippetpaths(file_paths: dict, json_file_path: str):
    with open(json_file_path, "w") as json_file:
        json.dump(file_paths, json_file, indent=4)
        print(f"logged to {json_file_path}")


snippet_paths = xslt(in_xml_dir_glob, xsl_filepath, output_dir)
log_snippetpaths(snippet_paths, output_dir + "/snippet_paths.json")
