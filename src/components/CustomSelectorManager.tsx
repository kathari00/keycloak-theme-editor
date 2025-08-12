import { useEffect, useMemo, useState, useCallback } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { type Component, type Editor } from "grapesjs";
import type { SelectorsResultProps } from '@grapesjs/react';
import { mdiMinus, mdiPlus, mdiUndo, mdiRedo } from "@mdi/js";
import Icon from "@mdi/react";
import { MAIN_BORDER_COLOR } from './common';

interface ThemePropertySelectorManagerProps extends Omit<SelectorsResultProps, 'Container'> {
    themeProperties: Record<string, string>;
    editor?: Editor;
    selectedComponent?: Component;
    onPropertyChange: (propName: string, value: string) => void;
    selectedClass: string | null;
    setSelectedClass: React.Dispatch<React.SetStateAction<string | null>>;
}

interface ClassHistory {
    classes: Record<string, string>;
    affectedClasses?: string[];
    targetComponent?: Component;
}

interface HistoryState {
    undo: ClassHistory[];
    redo: ClassHistory[];
}

export default function CustomSelectorManager({
                                                  targets = [],
                                                  themeProperties = {},
                                                  editor,
                                                  selectedComponent,
                                                  onPropertyChange,
                                                  selectedClass,
                                                  setSelectedClass,
                                              }: ThemePropertySelectorManagerProps) {
    const effectiveTargets = useMemo(
        () => (selectedComponent ? [selectedComponent] : targets),
        [selectedComponent, targets]
    );

    const [newClassNames, setNewClassNames] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<HistoryState>({ undo: [], redo: [] });

    const hasClass = (propKey: string, className: string) => {
        const classes = themeProperties[propKey];
        return classes && classes.split(/\s+/).includes(className);
    };

    const getPropertiesWithClass = useCallback(
        (className: string) => {
            const classNameWithoutDot = className.replace(/^\./, '');
            return Object.keys(themeProperties).filter((propKey) => {
                const classes = themeProperties[propKey] || '';
                return classes.split(/\s+/).includes(classNameWithoutDot);
            });
        },
        [themeProperties]
    );

    const kcProps = useMemo(() => {
        if (!editor) return [];
        const props: Array<{ propKey: string; value: string; classes: string[] }> = [];
        const propKeysSet = new Set<string>();

        effectiveTargets.forEach((target) => {
            if (typeof target === 'string') return;
            try {
                const attributes = target.getAttributes();
                const kcClasses = attributes['data-kc-class']?.split(/\s+/) || [];

                kcClasses.forEach((propKey: string) => {
                    if (propKeysSet.has(propKey)) return;
                    propKeysSet.add(propKey);

                    const allClasses = (themeProperties[propKey] || '').split(' ').filter(Boolean);
                    const wrapper = editor.DomComponents.getWrapper();
                    const allComponents = wrapper?.find('*') || [];

                    const visibleClasses = allClasses
                        .map((cls) => (cls.startsWith('.') ? cls : `.${cls}`))
                        .filter((cls) =>
                            allComponents.some((comp) => {
                                const compEl = comp.getEl();
                                if (!compEl) return false;

                                const compKcClasses = compEl.getAttribute('data-kc-class')?.split(/\s+/) || [];
                                return (
                                    compKcClasses.includes(propKey) &&
                                    comp.get('classes')?.models.some((c) => `.${c.get('name')}` === cls)
                                );
                            })
                        );

                    props.push({
                        propKey,
                        value: propKey,
                        classes: visibleClasses,
                    });
                });
            } catch (error) {
                console.error('Error processing component:', error);
            }
        });
        return props;
    }, [effectiveTargets, themeProperties, editor]);

    const saveStateToHistory = (affectedClasses?: string[]) => {
        const currentState: Record<string, string> = {};

        Object.keys(themeProperties).forEach((propKey) => {
            currentState[propKey] = themeProperties[propKey] || '';
        });

        setHistory((prev) => ({
            undo: [...prev.undo, { classes: currentState, affectedClasses }],
            redo: [],
        }));
    };

    const updateComponentsForProperties = useCallback(
        (props: Record<string, string>) => {
            if (!editor) return;

            const wrapper = editor.DomComponents.getWrapper();
            const componentsToUpdate = wrapper?.find('*') || [];

            componentsToUpdate.forEach((comp) => {
                const el = comp.getEl();
                if (!el) return;

                const kcClassAttr = el.getAttribute('data-kc-class');
                if (!kcClassAttr) return;

                const propKeys = kcClassAttr.split(/\s+/);
                const relevantProps = propKeys.filter((key) => props[key] !== undefined);

                if (relevantProps.length > 0) {
                    comp.get('classes')?.reset();

                    relevantProps.forEach((propKey) => {
                        const classesToAdd = (props[propKey] || '').split(/\s+/).filter(Boolean);
                        classesToAdd.forEach((className) => {
                            comp.addClass(className);

                            if (!editor.SelectorManager.get(className)) {
                                editor.SelectorManager.add(className);
                            }
                        });
                    });
                }
            });

            editor.refresh();
        },
        [editor]
    );

    const performHistoryAction = (isUndo: boolean) => {
        const historyKey = isUndo ? 'undo' : 'redo';
        const oppositeKey = isUndo ? 'redo' : 'undo';

        if (history[historyKey].length === 0) return;

        const lastState = history[historyKey].at(-1);
        if (!lastState) return;

        const currentSnapshot: ClassHistory = {
            classes: { ...themeProperties },
        };

        Object.entries(lastState.classes).forEach(([key, value]) => {
            onPropertyChange(key, value);
        });

        updateComponentsForProperties(lastState.classes);

        setHistory((prev) => ({
            ...prev,
            [historyKey]: prev[historyKey].slice(0, -1),
            [oppositeKey]: [...prev[oppositeKey], currentSnapshot],
        }));
    };

    const handleRemoveClass = (cls: string) => {
        const classNameWithoutDot = cls.replace(/^[.]/, '');
        const affectedProps = getPropertiesWithClass(cls);

        saveStateToHistory([classNameWithoutDot]);

        const updates: Record<string, string> = {};
        affectedProps.forEach((key) => {
            const currentClasses = themeProperties[key] || '';
            updates[key] = currentClasses
                .split(/\s+/)
                .filter((c) => c && c !== classNameWithoutDot)
                .join(' ');
        });

        Object.entries(updates).forEach(([key, value]) => {
            onPropertyChange(key, value);
        });

        updateComponentsForProperties(updates);

        if (selectedClass === cls) {
            setSelectedClass(null);
        }
    };

    const handleAddClass = (propKey: string) => {
        const newClassName = newClassNames[propKey]?.trim();
        if (!newClassName || hasClass(propKey, newClassName)) return;

        saveStateToHistory();

        const currentClasses = themeProperties[propKey] || '';
        const updatedClasses = currentClasses ? `${currentClasses} ${newClassName}` : newClassName;

        onPropertyChange(propKey, updatedClasses);

        setNewClassNames((prev) => ({ ...prev, [propKey]: '' }));
    };

    const handleSelectClass = useCallback(
        (cls: string) => {
            setSelectedClass(cls);
            if (editor) {
                editor.SelectorManager.select(cls);
            }
        },
        [editor, setSelectedClass]
    );

    useEffect(() => {
        if (selectedComponent) {
            setSelectedClass(null);
        }
    }, [selectedComponent, setSelectedClass]);

    useEffect(() => {
        if (selectedComponent && kcProps.length > 0 && !selectedClass) {
            const firstClass = kcProps[0].classes.find((cls) => !cls.startsWith('.pf'));
            if (firstClass) {
                    handleSelectClass(firstClass);
            }
        }
    }, [kcProps, selectedComponent, selectedClass, handleSelectClass]);

    return (
        <div className={`p-2 ${MAIN_BORDER_COLOR} border rounded`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Theme Properties</h3>
                <div className="flex gap-1">
                    <IconButton
                        size="small"
                        onClick={() => performHistoryAction(true)}
                        disabled={history.undo.length === 0}
                        title="Undo"
                        sx={{ borderRadius: '4px' }}
                    >
                        <Icon path={mdiUndo} size={0.8} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => performHistoryAction(false)}
                        disabled={history.redo.length === 0}
                        title="Redo"
                        sx={{ borderRadius: '4px' }}
                    >
                        <Icon path={mdiRedo} size={0.8} />
                    </IconButton>
                </div>
            </div>

            {kcProps.length === 0 ? (
                <div className="text-gray-500 p-4">
                    {selectedComponent ? 'No theme properties found' : 'No component selected'}
                </div>
            ) : (
                kcProps.map((prop) => (
                    <div key={prop.value} className="space-y-4 p-4">
                        <div className="border rounded p-4 bg-gray-50 bg-gray-800">
                            <div className="flex justify-between items-start">
                                <h3
                                    className="font-bold text-lg break-words"
                                    style={{ wordBreak: 'break-all' }}
                                >
                                    {prop.value}
                                </h3>
                            </div>
                            <div className="mt-3 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {prop.classes.map((cls, index) => (
                                        <div key={`${prop.value}-${cls}-${index}`} className="flex items-center gap-2">
                                            <Button
                                                variant={selectedClass === cls ? 'contained' : 'outlined'}
                                                color="primary"
                                                size="small"
                                                onClick={() => {
                                                    if (!cls.startsWith('.pf')) {
                                                        handleSelectClass(cls);
                                                    }
                                                }}
                                                sx={{
                                                    borderRadius: '6px',
                                                    padding: '4px 8px',
                                                    wordBreak: 'break-all',
                                                    minHeight: '33px',
                                                    fontSize: '0.9rem',
                                                    textTransform: 'none',
                                                    pointerEvents: cls.startsWith('.pf') ? 'none' : 'auto',
                                                }}
                                                disabled={cls.startsWith('.pf')}
                                            >
                                                {cls}
                                            </Button>
                                            <IconButton
                                                sx={{ borderRadius: '6px', height: '33px' }}
                                                color={'primary'}
                                                onClick={() => handleRemoveClass(cls)}
                                                title="Remove class"
                                            >
                                                <Icon path={mdiMinus} size={1} />
                                            </IconButton>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <TextField
                                        size="small"
                                        variant="outlined"
                                        value={newClassNames[prop.value] || ''}
                                        onChange={(e) => {
                                            const validValue = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '');
                                            setNewClassNames((prev) => ({
                                                ...prev,
                                                [prop.value]: validValue,
                                            }));
                                        }}
                                        placeholder="Add class"
                                        sx={{
                                            borderRadius: '6px',
                                            wordBreak: 'break-all',
                                            fontSize: '0.9rem',
                                            padding: '0',
                                            '& .MuiInputBase-input': {
                                                padding: '4px 8px',
                                            },
                                        }}
                                        error={!!themeProperties[prop.value] && !!hasClass(prop.value, newClassNames[prop.value]?.trim() || '')}
                                        helperText={
                                            !!themeProperties[prop.value] && !!hasClass(prop.value, newClassNames[prop.value]?.trim() || '')
                                                ? 'Class already exists'
                                                : ''
                                        }
                                    />
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleAddClass(prop.value)}
                                        disabled={!!(!newClassNames[prop.value]?.trim() || hasClass(prop.value, newClassNames[prop.value]?.trim() || ''))}
                                        title="Add class"
                                        sx={{ borderRadius: '6px', height: '33px' }}
                                    >
                                        <Icon path={mdiPlus} size={1} />
                                    </IconButton>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}

            <h3 className="font-bold mb-2 mt-3" style={{ wordBreak: 'break-all' }}>
                Selected Class
            </h3>
            <Button
                variant="contained"
                color="primary"
                size="small"
                sx={{
                    borderRadius: '6px',
                    padding: '4px 8px',
                    marginBottom: '16px',
                    minHeight: '33px',
                    wordBreak: 'break-all',
                    marginRight: '16px',
                    marginLeft: '16px',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                }}
            >
                {selectedClass ? selectedClass : 'No class selected'}
            </Button>
        </div>
    );
}