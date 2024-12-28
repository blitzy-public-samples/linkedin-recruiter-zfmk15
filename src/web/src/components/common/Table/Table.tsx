import React, { useCallback, useMemo, useState } from 'react'; // v18.2.0
import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
} from '@mui/material'; // v5.14+
import { styled } from '@mui/material/styles'; // v5.14+
import { debounce } from 'lodash'; // v4.17.21
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import Loading from '../Loading/Loading';

// Enhanced column definition interface
interface ColumnDefinition {
  id: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  tooltip?: string;
  headerClassName?: string;
  renderCell?: (value: any, row: any) => React.ReactNode;
  sortComparator?: (a: any, b: any) => number;
}

// Comprehensive table props interface
interface TableProps {
  data: Array<any>;
  columns: Array<ColumnDefinition>;
  loading?: boolean;
  pagination?: boolean;
  pageSize?: number;
  page?: number;
  totalCount?: number;
  sortBy?: string | null;
  sortOrder?: 'asc' | 'desc';
  stickyHeader?: boolean;
  dense?: boolean;
  selectable?: boolean;
  selected?: Array<string | number>;
  virtualization?: boolean;
  rowHeight?: number;
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: any) => void;
  onSelectionChange?: (selected: Array<string | number>) => void;
}

// Styled components with Material Design 3.0 principles
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  position: 'relative',
  maxHeight: '70vh',
  overflow: 'auto',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  [theme.breakpoints.down('sm')]: {
    maxHeight: '100vh',
  },
}));

const StyledTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => !['dense', 'mobile'].includes(prop as string),
})<{ dense?: boolean; mobile?: boolean }>(({ theme, dense, mobile }) => ({
  padding: dense ? theme.spacing(1) : theme.spacing(2),
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  ...(mobile && {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    '&:before': {
      content: 'attr(data-label)',
      float: 'left',
      fontWeight: theme.typography.fontWeightBold,
      marginRight: theme.spacing(1),
    },
  }),
}));

const StyledTableHeader = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  '& th': {
    fontWeight: theme.typography.fontWeightBold,
    color: theme.palette.text.primary,
  },
}));

// Custom hook for table sorting
const useTableSort = (
  initialSort: string | null = null,
  initialOrder: 'asc' | 'desc' = 'asc'
) => {
  const [sortBy, setSortBy] = useState(initialSort);
  const [sortOrder, setSortOrder] = useState(initialOrder);

  const handleSort = useCallback((column: string) => {
    const isAsc = sortBy === column && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(column);
  }, [sortBy, sortOrder]);

  return { sortBy, sortOrder, handleSort };
};

// Main table component
const Table: React.FC<TableProps> = React.memo(({
  data = [],
  columns,
  loading = false,
  pagination = true,
  pageSize = 10,
  page = 0,
  totalCount = 0,
  sortBy: externalSortBy,
  sortOrder: externalSortOrder,
  stickyHeader = true,
  dense = false,
  selectable = false,
  selected = [],
  virtualization = false,
  rowHeight = 53,
  onSort,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
}) => {
  // Initialize virtualization if enabled
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = virtualization
    ? useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 5,
      })
    : null;

  // Memoized sort handlers
  const handleSortClick = useMemo(
    () =>
      debounce((column: string) => {
        if (!onSort) return;
        const newOrder =
          externalSortBy === column && externalSortOrder === 'asc'
            ? 'desc'
            : 'asc';
        onSort(column, newOrder);
      }, 250),
    [externalSortBy, externalSortOrder, onSort]
  );

  // Memoized page change handler
  const handlePageChange = useCallback(
    (event: unknown, newPage: number) => {
      onPageChange?.(newPage);
    },
    [onPageChange]
  );

  // Render table header
  const renderHeader = () => (
    <StyledTableHeader>
      <TableRow>
        {columns.map((column) => (
          <StyledTableCell
            key={column.id}
            align={column.align}
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
            }}
            className={column.headerClassName}
            dense={dense}
          >
            {column.sortable ? (
              <TableSortLabel
                active={externalSortBy === column.id}
                direction={externalSortBy === column.id ? externalSortOrder : 'asc'}
                onClick={() => handleSortClick(column.id)}
                title={column.tooltip}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </StyledTableCell>
        ))}
      </TableRow>
    </StyledTableHeader>
  );

  // Render table body
  const renderBody = () => {
    const rows = virtualization ? rowVirtualizer!.getVirtualItems() : data;

    return (
      <TableBody>
        {rows.map((row, index) => {
          const actualRow = virtualization ? data[row.index] : row;
          return (
            <TableRow
              key={index}
              hover
              onClick={() => onRowClick?.(actualRow)}
              selected={selected.includes(actualRow.id)}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((column) => (
                <StyledTableCell
                  key={column.id}
                  align={column.align}
                  dense={dense}
                  data-label={column.label}
                >
                  {column.renderCell
                    ? column.renderCell(actualRow[column.id], actualRow)
                    : actualRow[column.id]}
                </StyledTableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <Paper>
        <Loading variant="linear" size="medium" />
      </Paper>
    );
  }

  return (
    <Paper>
      <StyledTableContainer ref={parentRef}>
        <MuiTable stickyHeader={stickyHeader} size={dense ? 'small' : 'medium'}>
          {renderHeader()}
          {renderBody()}
        </MuiTable>
      </StyledTableContainer>
      
      {pagination && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          rowsPerPage={pageSize}
          onPageChange={handlePageChange}
          onRowsPerPageChange={(event) =>
            onPageSizeChange?.(parseInt(event.target.value, 10))
          }
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
        />
      )}
    </Paper>
  );
});

Table.displayName = 'Table';

export { Table as default, useTableSort };
export type { TableProps, ColumnDefinition };