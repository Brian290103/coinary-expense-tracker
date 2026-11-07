PS G:\OpenSource Apps\coinary-expense-tracker> bun run build
$ tsc -b && vite build
src/App.tsx:1:25 - error TS1261: Already included file name 'G:/OpenSource Apps/coinary-expense-tracker/src/components/toaster.tsx' differs from file name 'G:/OpenSource Apps/coinary-expense-tracker/src/components/Toaster.tsx' only in casing.
  The file is in the program because:
    Imported via "@/components/toaster" from file 'G:/OpenSource Apps/coinary-expense-tracker/src/App.tsx'
    Matched by include pattern 'src' in 'G:/OpenSource Apps/coinary-expense-tracker/tsconfig.app.json'

1 import { Toaster } from "@/components/toaster";
                          ~~~~~~~~~~~~~~~~~~~~~~

  tsconfig.app.json:29:15
    29   "include": ["src"]
                     ~~~~~
    File is matched by include pattern specified here.

src/components/AccountSheet.tsx:2:1 - error TS6133: 'useLiveQuery' is declared but its value is never read.

2 import { useLiveQuery } from 'dexie-react-hooks';
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/CategorySheet.tsx:79:32 - error TS7006: Parameter 'reassignTo' implicitly has an 'any' type.

79   const performDelete = async (reassignTo) => {
                                  ~~~~~~~~~~

src/components/CategorySheet.tsx:137:40 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'SetStateAction<TxType>'.

137                 onClick={() => setType(opt)}
                                           ~~~

src/components/ConfirmHost.tsx:22:23 - error TS2339: Property 'cancelLabel' does not exist on type 'ConfirmRequest'.

22             {request?.cancelLabel || 'Cancel'}
                         ~~~~~~~~~~~

src/components/Money.tsx:20:28 - error TS2365: Operator '>' cannot be applied to types 'string | number' and 'number'.

20   const prefix = signed && minor > 0 ? '+' : '';
                              ~~~~~~~~~

src/components/Sidebar.tsx:10:33 - error TS2339: Property 'sidebarCollapsed' does not exist on type 'AppSettings'.

10   const collapsed = !!settings?.sidebarCollapsed;
                                   ~~~~~~~~~~~~~~~~

src/components/Sidebar.tsx:40:41 - error TS2353: Object literal may only specify known properties, and 'sidebarCollapsed' does not exist in type 'Partial<AppSettings>'.

40         onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
                                           ~~~~~~~~~~~~~~~~

src/components/SidebarNav.tsx:4:39 - error TS6133: 'LucideIcon' is declared but its value is never read.

4 import { Download, Plus, Upload, type LucideIcon } from 'lucide-react';
                                        ~~~~~~~~~~

src/components/toaster.tsx:25:13 - error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

25             {action}
               ~~~~~~~~

src/components/TransactionRow.tsx:2:15 - error TS6196: 'Account' is declared but never used.

2 import type { Account, Category, Transaction } from '@/lib/db';
                ~~~~~~~

src/components/transactions/FiltersPanel.tsx:94:36 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'SetStateAction<"all" | "income" | "expense">'.

94             onClick={() => setType(chip.value)}
                                      ~~~~~~~~~~

src/components/transactions/FiltersPanel.tsx:109:36 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'SetStateAction<"newest" | "oldest" | "highest" | "lowest">'.

109           onChange={(e) => setSort(e.target.value)}
                                       ~~~~~~~~~~~~~~

src/components/TransactionSheet.tsx:230:47 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'TxType'.

230                     onClick={() => changeType(opt.value)}
                                                  ~~~~~~~~~

src/components/ui/scroll-area.tsx:1:1 - error TS6133: 'React' is declared but its value is never read.

1 import * as React from "react"
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/pages/Categories.tsx:111:9 - error TS2322: Type 'string' is not assignable to type 'TxType | undefined'.

111         defaultType={tab}
            ~~~~~~~~~~~

  src/components/CategorySheet.tsx:16:3
    16   defaultType?: TxType;
         ~~~~~~~~~~~
    The expected type comes from property 'defaultType' which is declared here on type 'IntrinsicAttributes & CategorySheetProps'

src/pages/Insights.tsx:202:23 - error TS2322: Type '({ active, payload }: { active?: boolean; payload?: { payload: { minor: number; name: string; }; }[]; }) => React.JSX.Element | null' is not assignable to type 'ContentType<ValueType, NameType> | undefined'.
  Type '({ active, payload }: { active?: boolean; payload?: { payload: { minor: number; name: string; }; }[]; }) => React.JSX.Element | null' is not assignable to type '(props: TooltipContentProps<ValueType, NameType>) => ReactNode'.
    Types of parameters '__0' and 'props' are incompatible.
      Type 'TooltipContentProps<ValueType, NameType>' is not assignable to type '{ active?: boolean | undefined; payload?: { payload: { minor: number; name: string; }; }[] | undefined; }'.
        Types of property 'payload' are incompatible.
          The type 'TooltipPayload' is 'readonly' and cannot be assigned to the mutable type '{ payload: { minor: number; name: string; }; }[]'.

202                       content={({ active, payload }: { active?: boolean; payload?: { payload: { minor: number; name: string } }[] }) =>
                          ~~~~~~~

  node_modules/recharts/types/component/Tooltip.d.ts:65:5
    65     content?: ContentType<TValue, TName>;
           ~~~~~~~
    The expected type comes from property 'content' which is declared here on type 'IntrinsicAttributes & Omit<Props<ValueType, NameType>, PropertiesReadFromContext> & { ...; }'

src/pages/Insights.tsx:259:21 - error TS2322: Type '({ active, payload, label }: { active?: boolean; payload?: { payload: { minor: number; name?: string; }; }[]; label?: string | number; }) => React.JSX.Element | null' is not assignable to type 'ContentType<ValueType, NameType> | undefined'.
  Type '({ active, payload, label }: { active?: boolean; payload?: { payload: { minor: number; name?: string; }; }[]; label?: string | number; }) => React.JSX.Element | null' is not assignable to type '(props: TooltipContentProps<ValueType, NameType>) => ReactNode'.
    Types of parameters '__0' and 'props' are incompatible.
      Type 'TooltipContentProps<ValueType, NameType>' is not assignable to type '{ active?: boolean | undefined; payload?: { payload: { minor: number; name?: string | undefined; }; }[] | undefined; label?: string | number | undefined; }'.
        Types of property 'payload' are incompatible.
          The type 'TooltipPayload' is 'readonly' and cannot be assigned to the mutable type '{ payload: { minor: number; name?: string | undefined; }; }[]'.

259                     content={({ active, payload, label }: { active?: boolean; payload?: { payload: { minor: number; name?: string } }[]; label?: string | number }) =>
                        ~~~~~~~

  node_modules/recharts/types/component/Tooltip.d.ts:65:5
    65     content?: ContentType<TValue, TName>;
           ~~~~~~~
    The expected type comes from property 'content' which is declared here on type 'IntrinsicAttributes & Omit<Props<ValueType, NameType>, PropertiesReadFromContext> & { ...; }'

src/pages/Insights.tsx:321:62 - error TS2339: Property 'amount' does not exist on type 'never'.

321               value={data.largest ? formatMoney(data.largest.amount, currency, locale) : '—'}
                                                                 ~~~~~~

src/pages/Insights.tsx:322:65 - error TS2339: Property 'categoryId' does not exist on type 'never'.

322               hint={data.largest ? categoryMap.get(data.largest.categoryId)?.name || '' : 'No expenses yet'}
                                                                    ~~~~~~~~~~
