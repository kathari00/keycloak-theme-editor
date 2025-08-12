import {useState, useEffect, useRef, useCallback} from 'react';
import {createTheme, ThemeProvider} from "@mui/material/styles";
import type {Editor, EditorConfig} from "grapesjs";
import GjsEditor, {AssetsProvider, Canvas} from "@grapesjs/react";
import {MAIN_BORDER_COLOR, MAIN_BG_COLOR, MAIN_TXT_COLOR} from "./components/common";
import Topbar from "./components/Topbar";
import RightSidebar from "./components/RightSidebar";
import CustomAssetManager from "./components/CustomAssetManager";
import type { Component } from 'grapesjs';

const theme = createTheme({
    palette: {
        mode: 'dark',
    },
});

interface KeycloakProperties {
    [key: string]: string;
}

function App() {
    const [keycloakProperties, setKeycloakProperties] = useState<KeycloakProperties>({});
    const [templateContent, setTemplateContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedComponent, setSelectedComponent] = useState<Component | undefined>(undefined);
    const [loginHtml, setLoginHtml] = useState<string>('');
    const editorRef = useRef<Editor | undefined>(undefined);
    const hasComponentsAddedRef = useRef(false);

    const loadAssets = async () => {
        try {
            setIsLoading(true);
            const [templateRes, propsRes, loginRes] = await Promise.all([
                fetch('/keycloak-pages/template.html'),
                fetch('/keycloak-dev-resources/theme-properties.json'),
                fetch('/keycloak-pages/login.html')
            ]);

            const [template, props, login] = await Promise.all([
                templateRes.text(),
                propsRes.json(),
                loginRes.text()
            ]);

            setTemplateContent(template);
            setKeycloakProperties(props);
            setLoginHtml(login);
        } catch (error) {
            console.error('Failed to load assets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyKeycloakClasses = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const wrapper = editor.DomComponents.getWrapper();
        wrapper?.find('*').forEach(component => {
            const el = component.getEl();
            if (!el) return;

            const kcClassAttr = el.getAttribute('data-kc-class');
            component.set({
                selectable: !!kcClassAttr,
                hoverable: !!kcClassAttr,
                draggable: false,
                droppable: false
            });

            if (kcClassAttr) {
                kcClassAttr.split(/\s+/).forEach(propKey => {
                    const classValue = keycloakProperties[propKey];
                    if (classValue) {
                        classValue.split(/\s+/).forEach(className => {
                            const normalizedClassName = className.trim().startsWith('.')
                                ? className.trim()
                                : `.${className.trim()}`;
                            if (normalizedClassName.length > 1) {
                                component.addClass(normalizedClassName);
                            }
                        });
                    }
                });
            }
        });
    }, [keycloakProperties]);
    const insertLoginHtmlIntoPlaceholder = () => {
        const editor = editorRef.current;
        if (!editor || !loginHtml) return;

        const wrapper = editor.DomComponents.getWrapper();
        if (!wrapper) return;

        const placeholder = wrapper.find('[data-kc-content-placeholder="login"]')[0];
        if (!placeholder) return;

        placeholder.components(loginHtml);

        applyKeycloakClasses();
    };

    useEffect(() => {
        applyKeycloakClasses();
    }, [applyKeycloakClasses, keycloakProperties]);

    useEffect(() => {
        loadAssets();
        const handleImported = (e: CustomEvent) => {
            if (e.detail && typeof e.detail === 'object') {
                setKeycloakProperties(e.detail);
            }
        };
        window.addEventListener('themePropertiesImported', handleImported as EventListener);
        return () => {
            window.removeEventListener('themePropertiesImported', handleImported as EventListener);
        };
    }, []);

    const handleEditorInit = (editor: Editor) => {
        editorRef.current = editor;

        editor.on('component:selected', (component) => {
            setSelectedComponent(component);

        });

        editor.on('load', () => {
            if (templateContent && !hasComponentsAddedRef.current) {
                editor.setComponents(templateContent);
                applyKeycloakClasses();
                hasComponentsAddedRef.current = true;
                    insertLoginHtmlIntoPlaceholder();
           }
        });

        editor.on('component:add', (component) => {
            const el = component.getEl();
            const kcClassAttr = el?.getAttribute('data-kc-class');
            component.set({
                selectable: !!kcClassAttr,
                hoverable: !!kcClassAttr,
                draggable: false,
                droppable: false,
                copyable: false,
                removable: false
            });
        });
    };

    const handlePropertyChange = (propName: string | null, value: string) => {
        if (!propName) return;
        setKeycloakProperties(prev => ({
            ...prev,
            [propName]: value.split(/\s+/).filter(Boolean).join(' ')
        }));
    };

    const gjsOptions: EditorConfig = {
        height: '100vh',
        width: '100%',
        storageManager: false,
        selectorManager: {componentFirst: true},
        projectData: {
            pages: [
                {
                    name: 'Home page',
                    component: '',
                },
            ],
        },
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <ThemeProvider theme={theme}>
            <div className={`${MAIN_BG_COLOR} ${MAIN_TXT_COLOR} min-h-screen`}>
                <GjsEditor
                    className="gjs-custom-editor text-white bg-slate-900"
                    grapesjs="https://unpkg.com/grapesjs"
                    grapesjsCss="https://unpkg.com/grapesjs/dist/css/grapes.min.css"
                    options={gjsOptions}
                    plugins={[{id: 'gjs-blocks-basic', src: 'https://unpkg.com/grapesjs-blocks-basic'}]}
                    onEditor={handleEditorInit}
                >
                    <div className={`flex h-full border-t ${MAIN_BORDER_COLOR}`}>
                        <div className="gjs-column-m flex flex-col flex-grow">
                            <Topbar className="min-h-[48px]" keycloakProperties={keycloakProperties}/>
                            <Canvas className="flex-grow gjs-custom-editor-canvas"/>
                        </div>
                        <RightSidebar
                            className={`gjs-column-r w-[300px] border-l ${MAIN_BORDER_COLOR}`}
                            editor={editorRef.current}
                            keycloakProperties={keycloakProperties}
                            selectedComponent={selectedComponent}
                            onPropertyChange={handlePropertyChange}
                        />
                    </div>
                    <AssetsProvider>
                        {({assets, select, close, Container}) => (
                            <Container>
                                <CustomAssetManager assets={assets} select={select} close={close}/>
                            </Container>
                        )}
                    </AssetsProvider>
                </GjsEditor>
            </div>
        </ThemeProvider>
    );
}

export default App;
