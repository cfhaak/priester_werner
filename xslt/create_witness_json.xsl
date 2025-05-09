<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns="http://www.w3.org/2005/xpath-functions"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xsl:output method="text" encoding="UTF-8" />
    <!-- see https://www.w3.org/TR/xpath-functions-31/schema-for-json.xsd -->
    <xsl:variable name="snippet_path">
        <xsl:value-of select="'./witness_snippets/'" />
    </xsl:variable>
    <xsl:template match="/">
        <xsl:variable name="xml">
            <map>
                <xsl:for-each select="collection('../data/editions/?select=*.xml')">
                    <xsl:variable name="witness_title">
                        <xsl:value-of select="//tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:title" />
                    </xsl:variable>
                    <xsl:variable name="witness_id">
                        <xsl:value-of select="replace(//tei:sourceDesc/tei:msDesc/tei:msIdentifier/tei:idno/text(), '\s+', '_')" />
                    </xsl:variable>
                    <map key="{$witness_id}">
                        <string key="id">
                            <xsl:value-of select="replace(//tei:sourceDesc/tei:msDesc/tei:msIdentifier/tei:idno/text(), '\s+', '_')" />
                        </string>
                        <string key="title">
                            <xsl:value-of select="$witness_title" />
                        </string>
                        <string key="filepath">
                            <xsl:value-of select="concat($snippet_path, replace(tokenize(document-uri(.), '/')[last()], '\.xml$', '.html'))" />
                        </string>
                        <string key="sorting">
                            <xsl:value-of select="tokenize($witness_title)[last()]" />
                        </string>
                    </map>
                    <!-- 
                        <map>
                            <string key="id">
                                <xsl:value-of select="$witness_id" />
                            </string>
                            <string key="title">
                                <xsl:value-of select="$witness_title" />
                            </string>
                            <string key="filepath">
                                <xsl:value-of select="concat($snippet_path, replace(tokenize(document-uri(.), '/')[last()], '\.xml$', '.html'))" />
                            </string>
                            <string key="sorting">
                                <xsl:value-of select="tokenize($witness_title)[last()]" />
                            </string>
                        </map> -->
                </xsl:for-each>
            </map>
        </xsl:variable>
        <!-- OUTPUT -->
        <xsl:value-of select="xml-to-json($xml)" />
    </xsl:template>

</xsl:stylesheet>