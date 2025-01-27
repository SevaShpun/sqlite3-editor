import { enableMapSet } from "immer"
enableMapSet()

import { render } from "preact"
import { Editor, useEditorStore } from "./editor"
import { useEffect, useRef } from "preact/hooks"
import * as remote from "./remote"
import { Button, Checkbox, flash, Highlight, persistentUseState, renderContextmenu, Select, SVGOnlyCheckbox } from "./components"
import { escapeSQLIdentifier, Table, useTableStore } from "./table"
import "./scrollbar"
import { SettingsView } from "./schema_view"
import { onKeydown } from "./keybindings"
import { useBoolean, useEventListener, useInterval } from "usehooks-ts"
import type { JSXInternal } from "preact/src/jsx"

export type VSCodeAPI = {
    postMessage(data: unknown): void
    getState(): unknown
    setState(value: unknown): void
}

declare global {
    interface Window {
        acquireVsCodeApi?: () => VSCodeAPI
    }
}

/** Looping animation to indicate loading state, visible only when body.querying. */
const LoadingIndicator = () => {
    const ref = useRef<HTMLDivElement>(null)
    let x = 0
    const width = 200
    const t = Date.now()
    useEffect(() => {
        if (ref.current === null) { return }
        let canceled = false
        const loop = () => {
            if (canceled) { return }
            if (document.body.classList.contains("querying")) {
                ref.current!.style.left = `${x}px`
                x = (Date.now() - t) % (window.innerWidth + width) - width
                ref.current!.style.opacity = "1"
            } else {
                ref.current!.style.opacity = "0"
            }
            requestAnimationFrame(loop)
        }
        loop()
        return () => { canceled = true }
    }, [])
    return <div class="progressbar inline-block select-none pointer-events-none absolute top-0 z-[100] h-[5px] bg-primary opacity-0 [transition:opacity_0.5s_cubic-bezier(1.000,0.060,0.955,-0.120)]" ref={ref} style={{ width: width + "px" }}></div>
}

/** The root element. */
const App = () => {
    const requireReloading = useTableStore((s) => s.requireReloading)
    const isConfirmationDialogVisible = useTableStore((s) => s.isConfirmDialogVisible)
    const errorMessage = useTableStore((s) => s.errorMessage)
    const tableList = useTableStore((s) => s.tableList)
    const setViewerQuery = useTableStore((s) => s.setViewerQuery)
    const setPaging = useTableStore((s) => s.setPaging)
    const isFindWidgetVisible = useTableStore((s) => s.isFindWidgetVisible)
    const autoReload = useTableStore((s) => s.autoReload)
    const useCustomViewerQuery = useTableStore((s) => s.useCustomViewerQuery)
    const customViewerQuery = useTableStore((s) => s.customViewerQuery)
    const tableName = useTableStore((s) => s.tableName)
    const tableType = useTableStore((s) => s.tableList.find(({ name }) => name === tableName)?.type)
    const isTableRendered = useTableStore((s) => s.invalidQuery === null)
    const visibleColumnsSQL = useTableStore((s) => s.getVisibleColumnsSQL())
    const editorStatement = useEditorStore((s) => s.statement)
    const [isSettingsViewOpen, setIsSettingsViewOpen] = persistentUseState("isSettingsViewOpen", false)
    const confirmDialogRef = useRef<HTMLDialogElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const columnSelectDialogRef = useRef<HTMLDialogElement>(null)

    // Show or close the confirmation dialog
    useEffect(() => {
        if (isConfirmationDialogVisible) {
            confirmDialogRef.current?.showModal()
            document.querySelector<HTMLButtonElement>(".confirm-dialog-commit")?.focus()
        } else {
            confirmDialogRef.current?.close()
        }
    }, [isConfirmationDialogVisible])
    useEventListener("close", () => {
        const { isConfirmDialogVisible } = useTableStore.getState()
        if (isConfirmDialogVisible) {
            isConfirmDialogVisible("cancel")
        }
    }, confirmDialogRef)

    // Reload all tables if the database file is updated
    useEventListener("message", ({ data }: remote.Message) => {
        if (data.type === "sqlite3-editor-server" && data.requestId === undefined) {
            if (useTableStore.getState().autoReload) {
                requireReloading()
            }
        }
    })
    useInterval(() => {
        if (useTableStore.getState().reloadRequired) {
            useTableStore.getState().reloadAllTables()
                .catch(console.error)
        }
    }, 1000)

    // Register keyboard shortcuts
    useEventListener("keydown", onKeydown)

    // Commit changes in the UPDATE editor when the margin on the right side of table is clicked.
    useEventListener("click", async (ev) => {
        if (useEditorStore.getState().statement !== "UPDATE") { return }
        if (!tableRef.current || ev.target !== document.body) { return }
        const tableRect = tableRef.current.getBoundingClientRect()
        if (!(tableRect.top <= ev.clientY && ev.clientY < tableRect.bottom)) { return }
        if (!await useEditorStore.getState().beforeUnmount()) { return }
        await useEditorStore.getState().discardChanges()
    })

    // Call preventDefault() on unhandled contextmenu events while the context menu is open
    useEventListener("contextmenu", (ev) => {
        if (!document.querySelector<HTMLDialogElement>("#contextmenu")!.open) { return }
        if (ev.defaultPrevented) { return }
        ev.preventDefault()
        if (document.querySelector<HTMLDialogElement>("#contextmenu")!.open) {
            document.querySelector<HTMLDialogElement>("#contextmenu")!.close()
        }
    }, { current: document.body })

    const closeOnClickOutside = (ev: JSXInternal.TargetedMouseEvent<HTMLDialogElement>) => {
        if (/* undefined or 0 */!ev.clientX || !ev.clientY) { return }
        const rect = ev.currentTarget.getBoundingClientRect()
        if (rect.left <= ev.clientX && ev.clientX < rect.right &&
            rect.top <= ev.clientY && ev.clientY < rect.bottom) { return }
        ev.currentTarget.close()
    }

    return <>
        <LoadingIndicator />

        {/* Header `SELECT * FROM ...` */}
        <h2 class="pt-[var(--page-padding)]">
            <div class="mb-2">
                {/* SELECT * FROM ... */}
                {!useCustomViewerQuery && <>
                    <Highlight>SELECT </Highlight>
                    <span class="px-2 cursor-pointer hover:bg-gray-300 border-b-[1px] border-b-gray-500" onClick={() => { columnSelectDialogRef.current?.showModal() }}>{visibleColumnsSQL}</span>
                    <Highlight> FROM </Highlight>
                    {tableName === undefined ? <>No tables</> : <Select
                        value={tableName}
                        onChange={(value) => { setViewerQuery({ tableName: value }).catch(console.error) }}
                        options={Object.fromEntries(tableList.map(({ name: tableName, type }) => [tableName, { group: type }] as const).sort((a, b) => a[0].localeCompare(b[0])))}
                        class="primary"
                        onContextMenu={(ev) => {
                            renderContextmenu(ev, <>
                                <button onClick={async () => { setIsSettingsViewOpen(!isSettingsViewOpen) }}>Show Table Schema and Indexes</button>
                                {tableType === "table" && <button onClick={async () => { useEditorStore.getState().dropTable(tableName); flash(document.querySelector("#editor")!) }}>Drop Table</button>}
                                {tableType === "view" && <button onClick={async () => { useEditorStore.getState().dropView(tableName); flash(document.querySelector("#editor")!) }}>Drop View</button>}
                                {tableType === "table" && <button onClick={async () => { await useEditorStore.getState().alterTable(tableName, undefined); flash(document.querySelector("#editor")!) }}>Alter Table</button>}
                                <button onClick={async () => { useEditorStore.getState().createTable(tableName); flash(document.querySelector("#editor")!) }}>Create Table</button>
                                {tableType === "table" && <button onClick={async () => { useEditorStore.getState().createIndex(tableName); flash(document.querySelector("#editor")!) }}>Create Index</button>}
                                <hr />
                                <button onClick={async () => { await navigator.clipboard.writeText(tableName); flash(document.querySelector("#editor")!) }}>Copy Table Name</button>
                            </>)
                        }}
                        data-testid="table-name" />}
                </>}

                {/* Custom Query */}
                {useCustomViewerQuery && <>
                    <input placeholder="SELECT * FROM table-name" class="w-96" value={customViewerQuery} onBlur={(ev) => { setViewerQuery({ customViewerQuery: ev.currentTarget.value }).catch(console.error) }}></input>
                </>}

                {/* The checkbox to toggle the custom query mode */}
                <label class="ml-4 select-none cursor-pointer"><input type="checkbox" checked={useCustomViewerQuery} onChange={() => { setViewerQuery({ useCustomViewerQuery: !useCustomViewerQuery }).catch(console.error) }}></input> Custom</label>

                {/* The checkbox to toggle auto reloading */}
                <label class="select-none cursor-pointer ml-2" title="Reload the table when the database is updated by another process."><input type="checkbox" checked={autoReload} onChange={() => { useTableStore.setState({ autoReload: !autoReload }) }}></input> Auto reload</label>

                {/* Buttons placed right after the table name */}
                <div class="my-2">
                    {/* Schema */}
                    {!useCustomViewerQuery && <SVGOnlyCheckbox icon={isSettingsViewOpen ? "#close" : "#settings-gear"} title="Show Table Schema and Indexes" checked={isSettingsViewOpen} onClick={() => setIsSettingsViewOpen(!isSettingsViewOpen)} data-testid="schema-button"></SVGOnlyCheckbox>}

                    {/* Drop Table */}
                    {!useCustomViewerQuery && tableName && tableType === "table" && <SVGOnlyCheckbox icon="#trash" title="Drop Table" checked={editorStatement === "DROP TABLE"} onClick={(checked) => {
                        if (!checked) { useEditorStore.getState().cancel().catch(console.error); return }
                        useEditorStore.getState().dropTable(tableName)
                    }} data-testid="drop-table-button"></SVGOnlyCheckbox>}

                    {/* Drop View */}
                    {!useCustomViewerQuery && tableName && tableType === "view" && <SVGOnlyCheckbox icon="#trash" title="Drop View" checked={editorStatement === "DROP VIEW"} onClick={(checked) => {
                        if (!checked) { useEditorStore.getState().cancel().catch(console.error); return }
                        useEditorStore.getState().dropView(tableName)
                    }} data-testid="drop-view-button"></SVGOnlyCheckbox>}

                    {/* Alter Table */}
                    {!useCustomViewerQuery && tableName && tableType === "table" && <SVGOnlyCheckbox icon="#edit" title="Alter Table" checked={editorStatement === "ALTER TABLE"} onClick={(checked) => {
                        if (!checked) { useEditorStore.getState().cancel().catch(console.error); return }
                        useEditorStore.getState().alterTable(tableName, undefined).catch(console.error)
                    }} data-testid="alter-table-button"></SVGOnlyCheckbox>}

                    {/* Create Table button */}
                    <SVGOnlyCheckbox icon="#empty-window" title="Create Table" checked={editorStatement === "CREATE TABLE"} onClick={(checked) => {
                        if (!checked) { useEditorStore.getState().cancel().catch(console.error); return }
                        useEditorStore.getState().createTable(tableName)
                    }} data-testid="create-table-button"></SVGOnlyCheckbox>

                    {/* Create Index */}
                    {!useCustomViewerQuery && tableName && tableType === "table" && <SVGOnlyCheckbox icon="#book" title="Create Index" checked={editorStatement === "CREATE INDEX"} onClick={(checked) => {
                        if (!checked) { useEditorStore.getState().cancel().catch(console.error); return }
                        useEditorStore.getState().createIndex(tableName)
                    }} data-testid="create-index-button"></SVGOnlyCheckbox>}

                    {/* Custom Query button */}
                    <SVGOnlyCheckbox icon="#terminal" title="Custom Query" checked={editorStatement === "Custom Query"} onClick={(checked) => {
                        if (!checked) { useEditorStore.getState().cancel().catch(console.error); return }
                        useEditorStore.getState().custom(tableName)
                    }} data-testid="custom-query-button"></SVGOnlyCheckbox>

                    {/* Tools */}
                    <SVGOnlyCheckbox icon="#tools" title="Other Tools" onClick={(_, ev) => {
                        renderContextmenu(ev, <>
                            <button onClick={async () => {
                                await useTableStore.getState().setViewerQuery({
                                    useCustomViewerQuery: true,
                                    customViewerQuery: "SELECT * FROM pragma_journal_mode",  // PRAGMA functions require SQLite3 >=3.16.0 (2017-01-02)
                                    tableName: useTableStore.getState().tableName,
                                })
                            }}>Check Journal Mode</button>
                            <button onClick={async () => {
                                if (!await useEditorStore.getState().beforeUnmount()) { return }
                                useEditorStore.getState().custom(undefined, "PRAGMA journal_mode=WAL")
                                flash(document.querySelector("#editor")!)
                            }}>Enable WAL Mode…</button>
                            <hr />
                            <button onClick={() => remote.openTerminal(`{{install sqlite-utils &&}}echo '[{"x": 1, "y": 2}, {"x": 3, "y": 4}]' | {{pythonPath}} -m sqlite_utils insert {{databasePath}} table-name -`)}>Import Table from JSON…</button>
                            <button onClick={() => remote.openTerminal(`{{install sqlite-utils &&}}{{pythonPath}} -m sqlite_utils insert {{databasePath}} table-name input.csv --csv`)}>Import Table from CSV…</button>
                            <button onClick={() => remote.openTerminal(`sqlite3 {{databasePath}} < input.sql`)}>Import Tables from SQL…</button>
                            <hr />
                            <button onClick={() => remote.openTerminal(`{{install sqlite-utils &&}}{{pythonPath}} -m sqlite_utils query {{databasePath}} ${escapeShell(`SELECT * FROM ${escapeSQLIdentifier(tableName || "table-name")}`)} > out.json`)}>Export Table to JSON…</button>
                            <button onClick={() => remote.openTerminal(`{{install sqlite-utils &&}}{{pythonPath}} -m sqlite_utils query {{databasePath}} ${escapeShell(`SELECT * FROM ${escapeSQLIdentifier(tableName || "table-name")}`)} --csv > out.csv`)}>Export Table to CSV…</button>
                            <button onClick={() => remote.openTerminal(`sqlite3 {{databasePath}} .dump > out.sql`)}>Export Tables to SQL…</button>
                            <hr />
                            <button onClick={() => remote.openTerminal(`{{install sqlite-utils &&}}{{pythonPath}} -m sqlite_utils duplicate {{databasePath}} ${escapeShell(tableName || "table-name")} ${escapeShell((tableName || "table-name") + "-copy")}`)}>Copy Table…</button>
                        </>)
                    }}></SVGOnlyCheckbox>

                    {/* Find */}
                    {isTableRendered && !isSettingsViewOpen && <SVGOnlyCheckbox icon="#search" title="Find (Ctrl+f)" checked={isFindWidgetVisible} onClick={(checked) => {
                        useTableStore.getState().setFindWidgetVisibility(checked).catch(console.error)
                    }} data-testid="find-button"></SVGOnlyCheckbox>}
                </div>
            </div>
        </h2>

        {/* Schema and Index */}
        {isSettingsViewOpen && <div>
            <SettingsView />
            <hr class="mt-2 border-b-2 border-b-gray-400" />
        </div>}

        {/* Table */}
        {!isSettingsViewOpen && <>
            <div ref={tableRef} class="relative w-max max-w-full pl-[var(--page-padding)] pr-[var(--page-padding)]">
                <Table />
            </div>

            {/* The horizontal handle to resize the height of the table */}
            <div class="h-2 cursor-ns-resize select-none" onMouseDown={(ev) => {
                ev.preventDefault()
                document.body.classList.add("ns-resize")
                let prev = ev.pageY
                let visibleAreaSize = useTableStore.getState().paging.visibleAreaSize
                const onMouseMove = (ev: MouseEvent) => {
                    const trHeight = 18  // TODO: measure the height of a tr
                    let pageSizeDelta = 0n
                    while (ev.pageY - prev > trHeight) {
                        pageSizeDelta += 1n
                        prev += trHeight
                    }
                    while (ev.pageY - prev < -trHeight) {
                        pageSizeDelta -= 1n
                        prev -= trHeight
                    }
                    if (pageSizeDelta === 0n) { return }
                    visibleAreaSize += pageSizeDelta
                    setPaging({ visibleAreaSize }).catch(console.error)
                }
                window.addEventListener("mousemove", onMouseMove)
                window.addEventListener("mouseup", () => {
                    window.removeEventListener("mousemove", onMouseMove)
                    document.body.classList.remove("ns-resize")
                }, { once: true })
            }}>
                <hr class="mt-2 border-b-2 border-b-gray-400" />
            </div>
        </>}

        {/* Error Message */}
        {errorMessage && <p class="text-error-fg bg-error-bg [padding:10px]">
            <pre class="whitespace-pre-wrap [font-size:inherit] overflow-auto h-28 select-text">{errorMessage}</pre>
            <Button class="mt-[10px]" onClick={() => useTableStore.setState({ errorMessage: "" })}>Close</Button>
        </p>}

        {/* Editor */}
        <Editor />

        {/* Confirmation Dialog */}
        <dialog class="py-4 px-8 bg-gray-100 shadow-lg mx-auto mt-[10vh]" ref={confirmDialogRef}>
            <h2 class="pb-2 pl-0 text-center [font-size:120%]">Commit changes to the database?</h2>
            <div class="float-right">
                <Button onClick={() => { if (isConfirmationDialogVisible) { isConfirmationDialogVisible("commit") } }} class="confirm-dialog-commit mr-1" data-testid="dialog > commit">Commit</Button>
                <Button onClick={() => { if (isConfirmationDialogVisible) { isConfirmationDialogVisible("discard changes") } }} secondary={true} class="mr-1" data-testid="dialog > discard-changes">Discard changes</Button>
                <Button onClick={() => { if (isConfirmationDialogVisible) { isConfirmationDialogVisible("cancel") } }} secondary={true} data-testid="dialog > cancel">Cancel</Button>
            </div>
        </dialog>

        {/* SELECT dialog */}
        <dialog class="py-4 px-8 bg-gray-100 shadow-lg mx-auto mt-[10vh]" ref={columnSelectDialogRef} onClick={closeOnClickOutside}>
            <SelectedColumnEditor />
        </dialog>

        <dialog
            id="contextmenu"
            class="contextmenu"
            onClick={(ev) => { ev.currentTarget.close() }}></dialog>
    </>
}

const SelectedColumnEditor = () => {
    const visibleColumns = useTableStore((s) => s.visibleColumns)
    const tableInfo = useTableStore((s) => s.tableInfo)
    const setVisibleColumns = useTableStore((s) => s.setVisibleColumns)
    const error = useBoolean()
    return <>
        <Highlight>SELECT </Highlight>
        {tableInfo.map(({ name }, i) => <>{i !== 0 && ", "}<Checkbox
            checked={visibleColumns.includes(name)}
            onChange={async (checked) => {
                error.setFalse()
                if (checked) {
                    await setVisibleColumns([...visibleColumns, name])
                } else {
                    if (visibleColumns.length === 1) {
                        error.setTrue()
                        return
                    }
                    await setVisibleColumns(visibleColumns.filter((v) => v !== name))
                }
            }}
            text={name}
            class="mr-0" /></>)}
        {error.value && <p class="text-red-700 mt-1">Please select at least one column.</p>}
    </>
}

const escapeShell = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;

(async () => {
    await remote.downloadState()
    const tableList = await remote.getTableList()
    const tableName = (() => {
        const restored = remote.getState<string>("tableName")
        return restored && tableList.some(({ name }) => name === restored) ?
            restored :
            tableList[0]?.name
    })()
    useTableStore.setState({ tableList })
    await useTableStore.getState().setViewerQuery({ tableName })
    {
        const restored = remote.getState<number>("visibleAreaSize")
        if (restored !== undefined) {
            await useTableStore.getState().setPaging({ visibleAreaSize: BigInt(restored) })
        }
    }
    await useEditorStore.getState().switchTable(tableName)
    const s = useEditorStore.getState()
    if (s.statement === "CREATE TABLE" && remote.isSQLiteOlderThan3_37) {
        useEditorStore.setState({ strict: false })
    }
    render(<App />, document.body)
})().catch((err) => {
    console.error(err)
    document.write(err)
    document.write(useTableStore.getState().errorMessage)
})
