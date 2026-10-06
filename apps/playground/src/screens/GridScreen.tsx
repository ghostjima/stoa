// Data grid: the day's orders, a few hundred to fifty thousand of them,
// with selection, sorting, an editable status and a search that marks
// what it finds. The columns are chosen to fit a frame at its narrowest,
// so the grid never scrolls sideways.
import { memo, useMemo, useState } from "react";
import {
  DataGrid,
  EmptyState,
  Panel,
  Tag,
  TextField,
  useStoaFormat,
  type DataGridColumn,
  type DataGridEdit,
} from "@ghostjima/stoa-react";
import { ORDER_STATUSES, cachedGridOrders, type GridOrder } from "./data";
import { ErrorCallout, type ComponentScreenProps } from "./parts";
import { COMPONENT_WORDS, type OrderStatus } from "./words";

export const GridScreen = memo(function GridScreen(props: ComponentScreenProps) {
  // A new row count is a new set of orders: the grid starts over, edits,
  // selection and sort included.
  return <OrdersGrid key={props.gridRows} {...props} />;
});

function OrdersGrid({ language, state, onRetry, gridRows }: ComponentScreenProps) {
  const words = COMPONENT_WORDS[language];
  const text = words.grid;
  const locale = useStoaFormat();
  const [orders, setOrders] = useState(() => cachedGridOrders(gridRows));
  const [search, setSearch] = useState("");

  const columns = useMemo<DataGridColumn<GridOrder>[]>(
    () => [
      { id: "id", header: text.order, accessor: (order) => order.id, width: 104, pinned: true, sortable: true },
      { id: "symbol", header: text.symbol, accessor: (order) => order.symbol, width: 64, sortable: true },
      {
        id: "side",
        header: text.side,
        accessor: (order) => order.side,
        width: 72,
        sortable: true,
        format: (value) => (value === "buy" ? words.buy : words.sell),
      },
      {
        id: "status",
        header: text.status,
        accessor: (order) => order.status,
        width: 104,
        sortable: true,
        editor: {
          kind: "enum",
          options: ORDER_STATUSES.map((status) => ({ id: status, label: words.status[status] })),
          validate: (value, order) => (value === "cancelled" && order.status === "filled" ? text.filledCannotCancelText : null),
        },
      },
      { id: "quantity", header: text.quantity, accessor: (order) => order.quantity, width: 64, sortable: true },
      { id: "price", header: text.price, accessor: (order) => order.price, width: 72, sortable: true },
    ],
    [text, words],
  );

  const onEdit = ({ rowKey, value }: DataGridEdit<GridOrder>) =>
    setOrders((previous) => previous.map((order) => (order.id === rowKey ? { ...order, status: value as OrderStatus } : order)));

  const rows = state === "live" ? orders : [];
  return (
    <div className="pg-components">
      {state === "error" && (
        <ErrorCallout title={text.errorTitle} retry={words.retry} onRetry={onRetry}>
          {text.errorText(locale.digits("10:42"))}
        </ErrorCallout>
      )}
      <Panel title={text.title}>
        <div className="pg-stack">
          <div className="pg-grid-bar">
            <TextField label={text.searchLabel} value={search} onChange={setSearch} description={text.searchText} />
            <Tag tone="info">{text.rows(locale.integer(rows.length))}</Tag>
          </div>
          <DataGrid
            label={text.label}
            rows={rows}
            columns={columns}
            rowKey={(order) => order.id}
            selectionMode="multiple"
            defaultSort={{ column: "id", direction: "ascending" }}
            onEdit={onEdit}
            highlight={search.trim()}
            loading={state === "loading"}
            emptyState={
              state === "error" ? text.errorTitle : <EmptyState title={text.emptyTitle} description={text.emptyText} />
            }
          />
        </div>
      </Panel>
    </div>
  );
}
