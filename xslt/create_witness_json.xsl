<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns="http://www.w3.org/2005/xpath-functions"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xsl:output method="text" encoding="UTF-8" />
    <!-- see https://www.w3.org/TR/xpath-functions-31/schema-for-json.xsd -->
<xsl:variable name="snippet_path">
        <xsl:value-of select="'./html/witness_snippets/'" />
</xsl:variable>
<xsl:template
        match="/">
        <xsl:variable name="xml">
            <array>

                <xsl:for-each select="collection('../data/editions/?select=*.xml')">
                    <map>
                        <string key="title">
                            <xsl:value-of
                                select="//tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:title" />
                        </string>
                        <map key="data">
                            <string key="id">
                                <xsl:value-of select="//tei:TEI/@xml:id" />
                            </string>
                            <string key="filepath">
                                <xsl:value-of
                                    select="concat($snippet_path, replace(tokenize(document-uri(.), '/')[last()], '\.xml$', '.html'))" />
                            </string>
                            <string key="sorting">
                                <xsl:value-of select="''" />
                            </string>
                        </map>
                    </map>
                </xsl:for-each>
            </array>
        </xsl:variable>
        <!-- OUTPUT -->
    <xsl:value-of
            select="xml-to-json($xml)" />
    </xsl:template>

</xsl:stylesheet>