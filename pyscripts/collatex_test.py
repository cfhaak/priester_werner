from xml_aligner import XMLFileString
from collatex import Collation, collate


xfstr_1 = XMLFileString(
    file_path="../data/editions/sfe-1901-002__1901.1.xml",
    text_container_xpath="//tei:body/tei:div[1]"
)
xfstr_2 = XMLFileString(
    file_path="../data/editions/sfe-1901-002__1901.3.xml",
    text_container_xpath="//tei:body/tei:div[1]"
)

xfstr_1.result_test()
xfstr_2.result_test()

collation = Collation()
collation.add_plain_witness(xfstr_1.text_string, "witness1")
collation.add_plain_witness(xfstr_2.text_string, "witness2")
alignment_table = collate(collation)
print(alignment_table)