from saxonche import PySaxonProcessor
def xpath(
    xpath: str,
    file_path: str,
    namespaces: dict = {"tei": "http://www.tei-c.org/ns/1.0"},
):
    with PySaxonProcessor(license=False) as proc:
        xpath_proc = proc.new_xpath_processor()
        print(f"cwd: {xpath_proc.cwd}")
        xpath_proc.set_context(file_name=file_path)
        for namespace, uri in namespaces.items():
            xpath_proc.declare_namespace(namespace, uri)
        result = xpath_proc.evaluate(xpath)
        assert not (result is None), f"xpath matched nothing in {file_path}"
        return result