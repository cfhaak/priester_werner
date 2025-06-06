class Attribute:
    def __init__(self, char: str = ""):
        self.name = char
        self.value = ""

    def append_char_to_name(self, char: str):
        self.name += char

    def append_char_to_value(self, char: str):
        self.value += char


class Tag:
    # I know, I know
    # <([a-z]*) and
    # ([\w|data-]+)=[\"']?((?:.(?![\"']?\s+(?:\S+)=|\s*\/?[>\"']))+.)[\"']?
    # would have worked just fine, but state machines are fun! Especially if 
    # I created bugs, you have to fix ;) have fun!!!
    def __init__(self):
        self.name = ""
        self.__attributes = []
        self.__name_closed = False
        self.__attrib_val_open = False
        self.__attrib_name_open = False
        self.__attributes_dict = {}

    def append_char(self, char: str):
        if char not in ["\n", "\t", "/"]:
            if char == " ":
                if self.name == "":
                    # whitespace after <
                    pass
                else:
                    if self.__attrib_val_open:
                        self.__attributes[-1].append_char_to_value(char)
                    elif not self.__name_closed:
                        self.__name_closed = True
                    else:
                        pass
            elif char in ['"', "'"]:
                self.__attrib_val_open = not self.__attrib_val_open
            elif char == "=":
                self.__attrib_name_open = False
            else:
                if not self.__name_closed:
                    self.name += char
                elif self.__attrib_val_open:
                    self.__attributes[-1].append_char_to_value(char)
                elif self.__attrib_name_open:
                    self.__attributes[-1].append_char_to_name(char)
                else:
                    attrib = Attribute()
                    attrib.append_char_to_name(char)
                    self.__attributes.append(attrib)
                    self.__attrib_name_open = True

    def get_attributes(self):
        if not self.__attributes_dict:
            for attrib in self.__attributes:
                self.__attributes_dict[attrib.name] = attrib.value
        return self.__attributes_dict

    def get_attribute_val(self, attrib_name: str):
        val = self.get_attributes().get(attrib_name)
        if val is None:
            return ""
        return val
