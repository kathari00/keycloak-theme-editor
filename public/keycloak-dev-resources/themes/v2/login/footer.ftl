<#macro content>
    <#assign hasLegalLinks = msg("imprintUrl")?has_content || msg("dataProtectionUrl")?has_content>
    <div class="${properties.kcLoginMainFooter!} kc-legal-footer" data-kc-state="legal-footer"<#if !hasLegalLinks> hidden</#if>>
        <#if hasLegalLinks>
            <div class="kc-footer-legal-links" data-kc-state="footer-legal-links">
                <#if msg("imprintUrl")?has_content>
                    <a data-kc-state="imprint-link" href="${msg("imprintUrl")}" class="${properties.kcLoginMainFooterBandItem!}" target="_blank" rel="noopener noreferrer">${msg("imprintLabel")}</a>
                </#if>
                <#if msg("dataProtectionUrl")?has_content>
                    <a data-kc-state="data-protection-link" href="${msg("dataProtectionUrl")}" class="${properties.kcLoginMainFooterBandItem!}" target="_blank" rel="noopener noreferrer">${msg("dataProtectionLabel")}</a>
                </#if>
            </div>
        </#if>
    </div>
</#macro>
