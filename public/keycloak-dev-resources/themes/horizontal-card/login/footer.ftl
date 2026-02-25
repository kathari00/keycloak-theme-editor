<#macro content>
    <#-- Footer below the card for the Horizontal Card preset -->
    <div class="kc-horizontal-card-footer-row">
        <#if realm.internationalizationEnabled && locale.supported?size gt 1>
            <div class="kc-horizontal-card-footer-language" data-kc-state="language-selector">
                <div class="${properties.kcInputClass!""}">
                    <select
                        class="${properties.kcInputClass!""}"
                        aria-label="${msg("languages")}"
                        id="login-select-toggle"
                        onchange="if (this.value) { window.location.href = this.value; }"
                    >
                        <#list locale.supported?sort_by("label") as l>
                            <option value="${l.url}" <#if l.label == locale.current>selected="selected"</#if>>${l.label}</option>
                        </#list>
                    </select>
                </div>
            </div>
        </#if>

        <#if msg("imprintUrl")?has_content || msg("dataProtectionUrl")?has_content>
            <div class="kc-footer-legal-links" data-kc-state="footer-legal-links">
                <#if msg("imprintUrl")?has_content>
                    <a data-kc-state="imprint-link" href="${msg("imprintUrl")}" target="_blank" rel="noopener noreferrer">${msg("imprintLabel")}</a>
                </#if>
                <#if msg("dataProtectionUrl")?has_content>
                    <a data-kc-state="data-protection-link" href="${msg("dataProtectionUrl")}" target="_blank" rel="noopener noreferrer">${msg("dataProtectionLabel")}</a>
                </#if>
            </div>
        </#if>
    </div>
</#macro>
