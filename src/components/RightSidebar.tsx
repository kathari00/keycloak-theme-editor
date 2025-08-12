import * as React from 'react';
import {
    PagesProvider,
    SelectorsProvider,
    StylesProvider,
} from '@grapesjs/react';
import {
    mdiBrush,
    mdiFileMultiple,
} from '@mdi/js';
import Icon from '@mdi/react';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useState } from 'react';
import { MAIN_BORDER_COLOR, cx } from './common';
import CustomPageManager from './CustomPageManager';
import CustomSelectorManager from './CustomSelectorManager';
import CustomStyleManager from './CustomStyleManager';
import type {Editor, Component} from "grapesjs";

interface RightSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    themeProperties?: Record<string, string>;
    editor?: Editor;
    keycloakProperties?: Record<string, string>;
    selectedComponent?: Component;
    onPropertyChange: (propName: string | null, value: string) => void;
}

const defaultTabProps = {
    className: '!min-w-0',
};

export default function RightSidebar({
                                         className,
                                         editor,
                                         keycloakProperties = {},
                                         selectedComponent,
                                         onPropertyChange,
                                     }: RightSidebarProps) {
    const [selectedTab, setSelectedTab] = useState(0);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    return (
        <div className={cx('gjs-right-sidebar flex flex-col', className)}>
            <Tabs
                value={selectedTab}
                onChange={(_, v) => setSelectedTab(v)}
                variant="fullWidth"
            >
                <Tab {...defaultTabProps} label={<Icon size={1} path={mdiBrush}/>}/>
                <Tab {...defaultTabProps} label={<Icon size={1} path={mdiFileMultiple}/>}/>
            </Tabs>
            <div className={cx('overflow-y-auto flex-grow border-t', MAIN_BORDER_COLOR)}>
                {selectedTab === 0 && (
                    <>
                        <SelectorsProvider>
                            {(props) => (
                                <CustomSelectorManager
                                    {...props}
                                    editor={editor}
                                    themeProperties={keycloakProperties}
                                    selectedComponent={selectedComponent}
                                    onPropertyChange={onPropertyChange}
                                    selectedClass={selectedClass}
                                    setSelectedClass={setSelectedClass}
                                />
                            )}
                        </SelectorsProvider>
                        <StylesProvider>
                            {(props) => <CustomStyleManager {...props} />}
                        </StylesProvider>
                    </>
                )}
                {selectedTab === 1 && <PagesProvider>{(props) => <CustomPageManager {...props} />}</PagesProvider>}
            </div>
        </div>
    );
}