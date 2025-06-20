<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0"
  exclude-result-prefixes="tei">
  <!-- <xsl:output encoding="UTF-8" media-type="text/xml" method="xml" version="1.0" indent="yes" omit-xml-declaration="yes"/> -->
  <!-- Match the root and process all witnesses -->
  <xsl:template match="/">
    <xsl:for-each select="//tei:witness">
      <xsl:variable name="wit-id" select="concat('#', @xml:id)" />
      <xsl:variable name="file-name" select="concat(@xml:id, '.xml')" />
      <xsl:result-document href="./data/source/parzival/splitted/{$file-name}">
        <TEI xmlns="http://www.tei-c.org/ns/1.0">
          <xsl:copy-of select="//tei:teiHeader"/>
          <text>
            <body>
              <xsl:apply-templates select="//tei:body" mode="extract">
                <xsl:with-param name="wit-id" select="$wit-id"/>
              </xsl:apply-templates>
            </body>
          </text>
        </TEI>
      </xsl:result-document>
    </xsl:for-each>
  </xsl:template>

  <!-- Default: copy everything -->
  <xsl:template match="@*|node()" mode="extract">
    <xsl:param name="wit-id"/>
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="extract">
        <xsl:with-param name="wit-id" select="$wit-id"/>
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:template>

  <!-- For <app>: output only the matching <rdg> for this witness -->
  <xsl:template match="tei:app" mode="extract">
    <xsl:param name="wit-id"/>
    <xsl:choose>
      <xsl:when test="tei:rdg[contains(concat(' ', @wit, ' '), concat(' ', $wit-id, ' '))]">
        <xsl:apply-templates select="tei:rdg[contains(concat(' ', @wit, ' '), concat(' ', $wit-id, ' '))]" mode="extract">
          <xsl:with-param name="wit-id" select="$wit-id"/>
        </xsl:apply-templates>
      </xsl:when>
      <xsl:otherwise>
        <!-- Optionally, output nothing or a placeholder -->
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- For <rdg>: output its content, but not the <rdg> element itself -->
  <xsl:template match="tei:rdg" mode="extract">
    <xsl:param name="wit-id"/>
    <xsl:apply-templates mode="extract">
      <xsl:with-param name="wit-id" select="$wit-id"/>
    </xsl:apply-templates>
  </xsl:template>

  <xsl:template match="tei:lg" mode="extract">
    <xsl:param name="wit-id"/>
    <xsl:apply-templates mode="extract">
      <xsl:with-param name="wit-id" select="$wit-id"/>
    </xsl:apply-templates>
  </xsl:template>

  <xsl:template match="tei:l" mode="extract">
    <xsl:param name="wit-id"/>
    <tei:l>
      <xsl:attribute name="n">
        <xsl:value-of select="@xml:id"/>
      </xsl:attribute>
      <xsl:attribute name="xml:id">
        <xsl:value-of select="$wit-id"/>
        <xsl:number level="any"/>
      </xsl:attribute>
      <xsl:apply-templates select="@*|node()" mode="extract">
        <xsl:with-param name="wit-id" select="$wit-id"/>
      </xsl:apply-templates>
  </tei:l>
  </xsl:template>

  <xsl:template match="*[@edRef]" mode="extract">
  <xsl:param name="wit-id"/>
  <xsl:if test="contains(@edRef, $wit-id)">
    <!-- This will be true if @edRef contains the witness id (including #) -->
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="extract">
        <xsl:with-param name="wit-id" select="$wit-id"/>
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:if>
  <!-- Otherwise, nothing is output -->
</xsl:template>

  <!-- Optionally, suppress <lem> or other apparatus children -->
  <xsl:template match="tei:lem" mode="extract"/>

</xsl:stylesheet>