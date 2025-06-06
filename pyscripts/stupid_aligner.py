import os
import re
import glob
from acdh_tei_pyutils.tei import TeiReader

####################
# vars
####################
in_xml_dir_glob = "./data/source/*"
output_dir = "./edition/data/"

###################
# checks
###################

# with PySaxonProcessor(license=False) as proc:
#     print(f"using {proc.version}")
    
os.makedirs(
    os.path.dirname(output_dir),
    exist_ok=True
)

##################
# running it
##################

def get_outputfile(input_path: str, output_dir: str) -> str:
    filename = os.path.basename(input_path)
    return os.path.join(output_dir, filename)

def get_uid(xml_filepath: str, xpath="//tei:titleStmt/tei:title/text()"):
    doc = TeiReader(xml_filepath)
    title = doc.any_xpath(xpath)[0]
    return title

class Witness:
    def __init__(self, xml_filepath):
        self.xml_filepath = xml_filepath
        self.doc = TeiReader(xml_filepath)
        self.id = self.get_id()
        self.raw_text = self.get_raw_text()
        self.text_list = self.get_text_list()
        
    def get_id(self):
        self.doc.any_xpath("//tei:fileDesc/tei:titleStmt/tei:title[@type='manifestation']/text()")[0].split(".")[-1].strip(")")

    def get_text_list(self):
        return re.split(r"\s+", self.raw_text)

    def get_raw_text(self):
        basic_string = " ".join([t.strip() for t in self.doc.any_xpath("//tei:body//text()")])
        basic_string = re.sub(r"\s+", " ", basic_string)
        return basic_string
        
    def get_list_text(self):
        return "\n".join(self.text_list)
        
    def to_dict(self):
        return {
            "uid": self.id,
            "xml_filepath": self.xml_filepath
        }
        
    def get_outputfile(self) -> str:
        filename = os.path.basename(self.xml_filepath)
        return os.path.join(output_dir, filename)

def load_files():
    for xml_filepath in glob.glob(in_xml_dir_glob):
        yield Witness(xml_filepath)

def test():
    for w in load_files():
        print(w.id)
        print(w.raw_text)
        print(w.text_list)
        print(w.to_dict())
        input()
    
if __name__ == "__main__":
    # witnesses = [w for w in load_files()]
    test()

        