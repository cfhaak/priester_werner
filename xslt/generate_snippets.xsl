<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0" exclude-result-prefixes="tei">
    <xsl:output method="html" omit-xml-declaration="yes" encoding="UTF-8"/>

    <xsl:strip-space elements="tei:choice" />
    <xsl:template match="tei:teiHeader">

    </xsl:template>
    <xsl:template match="tei:note[@type='editorial']">
        <span class="editorial_note">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <xsl:template match="tei:unclear">
        <span class="unclear">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <xsl:template match="tei:del">
        <span class="del">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <xsl:template match="tei:add">
        <span class="del">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <xsl:template match="tei:ex">
        <span class="ex">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <xsl:template match="tei:reg">
        <xsl:choose>
            <xsl:when test="@ana = 'long_s'">
                <span class="s_reg">
                    <xsl:apply-templates/>
                </span>
            </xsl:when>
            <xsl:when test="@ana = 'sup'">
                <span class="sup_reg">
                    <xsl:apply-templates/>
                </span>
            </xsl:when>
        </xsl:choose>
    </xsl:template>
    <xsl:template match="tei:orig">
        <xsl:choose>
            <xsl:when test="@ana = 'long_s'">
                <span class="s_orig">
                    <xsl:apply-templates/>
                </span>
            </xsl:when>
        </xsl:choose>
        <xsl:choose>
            <xsl:when test="@ana = 'sup'">
                <span class="sup_orig">
                    <xsl:apply-templates/>
                </span>
            </xsl:when>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="tei:lb">
        <span class="lb">|</span>
    </xsl:template>

    <xsl:template match="tei:hi">
        <span>
            <xsl:choose>
                <xsl:when test="@rendition = '#em'">
                    <xsl:attribute name="class">
                        <xsl:text>italic</xsl:text>
                    </xsl:attribute>
                </xsl:when>
                <xsl:when test="@rendition = '#italic'">
                    <xsl:attribute name="class">
                        <xsl:text>italic</xsl:text>
                    </xsl:attribute>
                </xsl:when>
                <xsl:when test="@rendition = '#smallcaps'">
                    <xsl:attribute name="class">
                        <xsl:text>smallcaps</xsl:text>
                    </xsl:attribute>
                </xsl:when>
                <xsl:when test="@rendition = '#bold'">
                    <xsl:attribute name="class">
                        <xsl:text>bold</xsl:text>
                    </xsl:attribute>
                </xsl:when>
                <xsl:when test="@rend = 'rub'">
                    <xsl:attribute name="class">
                        <xsl:text>rub</xsl:text>
                    </xsl:attribute>
                </xsl:when>
                <xsl:when test="@rend = 'init'">
                    <xsl:attribute name="class">
                        <xsl:text>init</xsl:text>
                    </xsl:attribute>
                </xsl:when>
            </xsl:choose>
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <xsl:template match="tei:lg">
        <p>
            <xsl:apply-templates/>
        </p>
    </xsl:template>
    <!-- <xsl:template match="tei:choice">
        <span class="choice">
            <xsl:apply-templates/>
        </span>
    </xsl:template> -->
    <xsl:template match="//tei:choice">
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="tei:orig">
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="tei:reg">
    </xsl:template>
    <xsl:template match="tei:abbr">
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="tei:expan">
    </xsl:template>

    <xsl:template match="tei:am">
        <!-- <span class="am"> -->
            <xsl:apply-templates/>
        <!-- </span> -->
    </xsl:template>
    <!-- Abstract template for lines -->
    <xsl:template name="render-line">
        <xsl:param name="class" />
        <xsl:param name="linenr-global" />
        <xsl:param name="linenr-own" />

        <span class="witness-line {$class}" data-n="{$linenr-global}" id="{$linenr-global}">
            <span class="linenr-global">
                <xsl:value-of select="$linenr-global" />
                    &#160;&#160;
            </span>
            <span class="linenr_own">
                <xsl:value-of select="$linenr-own" />
                    &#160;&#160;
            </span>
            <xsl:apply-templates />
            <br />
        </span>
    </xsl:template>

    <xsl:template match="tei:l">
        <xsl:variable name="class" select="
            if (@ana = 'om') then 'om'
            else if (not(normalize-space(.))) then 'om'
            else if (@ana = 'last') then 'last'
            else 'normal'" />
        <xsl:variable name="linenr-global" select="@n" />
        <xsl:variable name="linenr-own" select="@xml:id" />
        <xsl:call-template name="render-line">
            <xsl:with-param name="class" select="$class" />
            <xsl:with-param name="linenr-global" select="$linenr-global" />
            <xsl:with-param name="linenr-own" select="$linenr-own" />
        </xsl:call-template>
    </xsl:template>

</xsl:stylesheet>
