import * as React from 'react';
import {useState} from 'react';
import {useEditor} from '@grapesjs/react';
import {cx} from './common';
import Button from '@mui/material/Button';
import CustomModal from './CustomModal';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';


export default function TopbarButtons({
                                          className,
                                          keycloakProperties,
                                      }: React.HTMLAttributes<HTMLDivElement> & {
    keycloakProperties: Record<string, string>
}) {
    const editor = useEditor();
    const [codeModalOpen, setCodeModalOpen] = useState(false);
    const [, setCodeModalContent] = useState('');


    const handleExport = () => {
        if (!editor) return;
        const css = editor.getCss();
        const header = [
            'parent=base',
            'import=common/keycloak',
            'styles=css/styles.css',
            'stylesCommon=vendor/patternfly-v5/patternfly.min.css vendor/patternfly-v5/patternfly-addons.css',
            'darkMode=true',
            '',
        ].join('\n');
        const propertiesText = toJavaProperties(keycloakProperties || {});
        const exportText = `/* CSS */\n${css}\n\n/* Theme Properties */\n${header}\n${propertiesText}`;
        setCodeModalContent(exportText);
        setCodeModalOpen(true);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const toJavaProperties = (obj: Record<string, string>) => {
        return Object.entries(obj)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
    };
    const parseJavaProperties = (text: string): Record<string, string> => {
        const result: Record<string, string> = {};
        text.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const idx = trimmed.indexOf('=');
            if (idx > 0) {
                const key = trimmed.slice(0, idx).trim();
                result[key] = trimmed.slice(idx + 1).trim();
            }
        });
        return result;
    };

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importCss, setImportCss] = useState('');
    const [importProps, setImportProps] = useState('');

    const handleImport = () => {
        setImportModalOpen(true);
    };
    const handleImportApply = () => {
        if (editor && importCss) {
            editor.setStyle(importCss);
        }
        if (importProps) {
            const parsed = parseJavaProperties(importProps);
            const existingKeys = Object.keys(keycloakProperties);
            const importedKeys = Object.keys(parsed);
            const missing = importedKeys.filter(key => !existingKeys.includes(key));
            setMissingKeys(missing);
            if (missing.length === 0) {
                setImportModalOpen(false);
            }
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('themePropertiesImported', { detail: parsed }));
            }
        } else {
            setImportModalOpen(false);
        }
    };

    const [exportCss, setExportCss] = useState('');
    const [exportProps, setExportProps] = useState('');

    React.useEffect(() => {
        if (codeModalOpen && editor) {
            setExportCss(editor.getCss() || '');
            const header = [
                'parent=base',
                'import=common/keycloak',
                'styles=css/styles.css',
                'stylesCommon=vendor/patternfly-v5/patternfly.min.css vendor/patternfly-v5/patternfly-addons.css',
                'darkMode=true',
                '',
            ].join('\n');
            setExportProps(`${header}\n${toJavaProperties(keycloakProperties)}`);
        }
    }, [codeModalOpen, keycloakProperties, editor]);

    const [missingKeys, setMissingKeys] = useState<string[]>([]);


    return (
        <div className={cx('flex gap-3', className)}>
            <Button
                variant="contained"
                color="primary"
                size="small"
                sx={{minHeight: '33px', borderRadius: '6px', padding: '0 8px', boxShadow: 'none'}}
                onClick={handleImport}
            >
                Import theme
            </Button>
            <CustomModal
                open={importModalOpen}
                title="Import (CSS & Theme Properties)"
                close={() => setImportModalOpen(false)}
                sx={{minHeight: '1000px'}}
            >
                <div>
                    {missingKeys.length > 0 && (
                        <Alert severity="warning" sx={{mb: 2, fontSize: '0.95em', width: '100%', pt: 1}}>
                            The following keys could not be matched and do not exist in the official Keycloak theme:
                            <Stack direction="row" spacing={1} sx={{mt: 1, flexWrap: 'wrap'}}>
                                {missingKeys.map(key => (
                                    <Chip key={key} label={key} color="warning" size="small" />
                                ))}
                            </Stack>
                        </Alert>
                    )}
                    <div className="p-4 flex flex-row gap-8">
                        <div className="flex-1 flex flex-col">
                            <h4 className="font-bold mb-2">CSS</h4>
                            <textarea
                                className="outline outline-1 outline-gray-400 rounded w-full text-xs font-mono p-2 bg-transparent text-gray-800 text-gray-200"
                                value={importCss}
                                onChange={e => setImportCss(e.target.value)}
                                rows={16}
                                style={{resize: 'vertical', minHeight: '100px', maxHeight: '300px'}}
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <h4 className="font-bold mb-2">Theme Properties (Java Properties Format)</h4>
                            <textarea
                                className="outline outline-1 outline-gray-400 rounded w-full text-xs font-mono p-2 bg-transparent text-gray-800 text-gray-200"
                                value={importProps}
                                onChange={e => setImportProps(e.target.value)}
                                rows={16}
                                style={{resize: 'vertical', minHeight: '100px', maxHeight: '300px'}}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 p-2">
                        <Button variant="contained" color="primary" onClick={handleImportApply}>Import</Button>
                    </div>
                </div>
            </CustomModal>
            <Button
                variant="contained"
                color="primary"
                size="small"

                sx={{minHeight: '33px', borderRadius: '6px', padding: '0 8px', boxShadow: 'none'}}
                onClick={handleExport}
            >
                Export theme
            </Button>
            <CustomModal
                open={codeModalOpen}
                title="Code-Export (CSS & Theme Properties)"
                close={() => setCodeModalOpen(false)}
                sx={{minHeight: '1000px'}}
            >
                <div className="p-4 flex flex-row gap-8">
                    <div className="relative flex-1  flex flex-col">
                        <h4 className="font-bold mb-2">CSS</h4>
                        <IconButton
                            size="small"
                            sx={{position: 'absolute', top: 0, right: 0}}
                            onClick={() => handleCopy(exportCss)}
                            aria-label="CSS kopieren"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none"
                                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </IconButton>
                        <textarea
                            className="outline outline-1 outline-gray-400 rounded w-full text-xs font-mono p-2 bg-transparent"
                            value={exportCss}
                            readOnly
                            rows={16}
                            style={{resize: 'vertical', minHeight: '100px', maxHeight: '300px'}}
                        />
                    </div>
                    <div className="relative flex-1 flex flex-col">
                        <h4 className="font-bold mb-2">Theme Properties (Java Properties Format)</h4>
                        <IconButton
                            size="small"
                            sx={{position: 'absolute', top: 0, right: 0}}
                            onClick={() => handleCopy(exportProps)}
                            aria-label="Theme Properties kopieren"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none"
                                 viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </IconButton>
                        <textarea
                            className="outline outline-1 outline-gray-400 rounded w-full text-xs font-mono p-2 bg-transparent"
                            value={exportProps}
                            readOnly
                            rows={16}
                            style={{resize: 'vertical', minHeight: '100px', maxHeight: '300px'}}
                        />
                    </div>
                </div>
            </CustomModal>
        </div>
    );
}
