import type {PagesResultProps} from '@grapesjs/react';
import {MAIN_BORDER_COLOR, cx} from './common';

export default function CustomPageManager({
                                              pages,
                                              select,
                                          }: PagesResultProps) {
    return (
        <div className="gjs-custom-page-manager">

            {pages.map((page, index) => (
                <div
                    key={page.getId()}
                    className={cx(
                        'flex items-center py-2 px-4 border-b',
                        index === 0 && 'border-t',
                        MAIN_BORDER_COLOR
                    )}
                >
                    <button
                        type="button"
                        className="flex-grow text-left"
                        onClick={() => select(page)}
                    >
                        {page.getName() || 'Untitled page'}
                    </button>

                </div>
            ))}
        </div>
    );
}
