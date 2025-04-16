<xsl:stylesheet version="3.0" 
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns="http://www.w3.org/2005/xpath-functions"
xmlns:tei="http://www.tei-c.org/ns/1.0"
xmlns:xs="http://www.w3.org/2001/XMLSchema">
<xsl:output method="text" encoding="UTF-8"/>
<!-- see https://www.w3.org/TR/xpath-functions-31/schema-for-json.xsd -->

<xsl:template match="/">
    <xsl:variable name="xml">
        <array>
        
        <xsl:for-each select="collection('../data/editions/?select=*.xml')" >
                <map>
                    <string key="title">
                        <!-- <xsl:value-of select="//tei:teiHeader/tei:sourceDesc/tei:msDesc/tei:idno"/> -->
                        <xsl:value-of select="//tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:title"/>
                    </string>
                    <string key="path">
                        <map>
                            <xsl:value-of select="tokenize(document-uri(.), '/')[last()]"/>
                        </map>
                    </string>
                </map>
            </xsl:for-each>
        </array>
    </xsl:variable>
    <!-- OUTPUT -->
    <xsl:value-of select="xml-to-json($xml)"/>
</xsl:template>

</xsl:stylesheet>