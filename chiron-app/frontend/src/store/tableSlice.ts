import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { APIRequest, APIFileRequest } from "../api";
import _ from "lodash";
import { CohortState } from "./cohortSlice";
import {
  TableState,
  TableDef,
  SortDef,
  ColumnDef,
  TableColumn,
  Transformation,
} from "./tableSliceTypes";

const initialState: TableState = {
  errors: [],
  warnings: [],
  tableStatus: "idle",
  pageSize: 25,
};

function translateTableDefToColumns(tableDef: TableDef["extended_table_def"]) {
  // build sorting lookups,
  const sorting: { [k: string]: number } = {};
  tableDef.sort.forEach(
    (sort: SortDef) => (sorting[sort.entry_id] = sort.direction)
  );
  if (tableDef.fields.length) {
    return tableDef.fields.map((item: ColumnDef) => ({
      entryId: item.entry_id,
      conceptId: item.concept_id,
      name: item.label,
      categories: item.categories,
      canDelete: item.can_delete,
      canSort: item.can_sort,
      hasErrors: item.has_errors,
      isAggregate: item.aggregate,
      aggregationColumnText: item.aggregation_method?.replace("_", " "),
      aggregationMethod: _.startCase(
        item.aggregation_method?.replace("_", " ")
      ),
      alias: item.alias ?? undefined,
      categorize: item.categorize,
      sortDirection: sorting[item.entry_id] ?? undefined,
    }));
  }
  return [];
}

export const loadTableDef = createAsyncThunk(
  "table/loadTableDef",
  async ({
    dataset,
    page = 1,
    pageSize = 25,
    data = undefined,
  }: {
    dataset: string;
    page?: number;
    pageSize?: number;
    data?: undefined | TableDef;
  }) => {
    const queryStrings = [`page=${page}`, `records_per_page=${pageSize}`];

    let response;
    if (data == undefined) {
      response = await APIRequest(
        "GET",
        `/api/v2/${dataset}/query_tools/preview/?${queryStrings.join("&")}`
      );
    } else {
      response = data;
    }

    return {
      errors: response.errors,
      warnings: response.warnings,
      columns: translateTableDefToColumns(response.extended_table_def),
      tableDef: response.extended_table_def,
      firstIndex: response.paginator.first_index,
      lastIndex: response.paginator.last_index,
      currentPage: response.paginator.current_page,
      pageSize: pageSize,
      lastPage: response.paginator.last_page,
      results: response.data,
      recordCount: response.record_count,
      subjectCount: response.subject_count,
      tableStatus: "done",
    };
  }
);

export const loadColumnInformation = createAsyncThunk(
  "table/loadColumnInformation",
  async ({ dataset, column }: { dataset: string; column: TableColumn }) => {
    const response = await APIRequest(
      "GET",
      `/api/v2/${dataset}/concepts/${column.conceptId}/?include_table_def_options=true&table_def_entry_id=${column.entryId}`
    );

    return {
      editColumn: {
        ...response.table_def_options,
        concept: response.name,
        conceptId: response.permanent_id,
        aggregateOptions: undefined,
      },
    };
  }
);

export const loadAggregateOptions = createAsyncThunk(
  "table/loadAggregateOptions",
  async ({ url, search }: { url: string; search: string }) => {
    const finalUrl = `${url}${search}`;
    const response = await APIRequest("GET", finalUrl);
    return {
      aggregateOptions: response.results,
    };
  }
);

export const downloadCsvFile = createAsyncThunk(
  "table/downloadCsvFile",
  async (payload: {
    dataset: string;
    cohort_def: CohortState["extended_cohort_def"];
    table_def?: TableDef["extended_table_def"];
    report_id?: number;
  }) => {
    const urlString = !payload.report_id
      ? `query_tools`
      : `report_tools/${payload.report_id}`;

    if (!payload.report_id) {
      await APIFileRequest(
        "POST",
        `/api/v2/${payload.dataset}/${urlString}/export_csv/`,
        "results_export.csv",
        payload
      );
    } else {
      await APIFileRequest(
        "GET",
        `/api/v2/${payload.dataset}/${urlString}/export_csv/`,
        "results_export.csv"
      );
    }
  }
);

//make this a custom action rather than a reducer so it returns a promise
export const addStageTransformation = createAsyncThunk(
  "table/addStageTransformation",
  async (payload: {
    stagedTransformations: Transformation[] | undefined;
    newAction: Transformation;
  }) => {
    if (!payload.stagedTransformations) {
      return { stagedTransformations: [payload.newAction] };
    }
    const copyState = [...payload.stagedTransformations];
    copyState.push(payload.newAction);
    return { stagedTransformations: copyState };
  }
);

export const applyStageTransformations = createAsyncThunk(
  "table/applyStageTransformations",
  async (
    payload: { stagedTransformations: Transformation[]; dataset: string },
    thunkApi
  ) => {
    let baseRet;
    /*
        need to make request so we can get associated entry_ids.
        api returns error if there haven't been any post requests made to the table_def
        so we need to catch that error on a brand new state with no snapshots, won't affect
        the rest of functionality because first transformation will always be add_entry
        */
    try {
      baseRet = await APIRequest(
        "GET",
        `/api/v2/${payload.dataset}/table_def/`
      );
    } catch (error) {
      baseRet;
    }

    for (const transform of payload.stagedTransformations) {
      const finalTransform = { ...transform };

      //get the entry id to delete
      if (finalTransform.type == "delete_entry") {
        if (!finalTransform.entry_id) {
          finalTransform.entry_id = baseRet.extended_table_def.fields.find(
            (t: Transformation) => t.concept_id == finalTransform.concept_id
          )?.entry_id;
        }
      }
      //get the new order of entry ids
      if (
        finalTransform.type == "resort_columns" &&
        typeof finalTransform.src == "number" &&
        typeof finalTransform.dest == "number"
      ) {
        const entryIdList = baseRet.extended_table_def.fields.map(
          (t: Transformation) => t.entry_id
        );
        const heldOut = entryIdList[finalTransform.src];
        entryIdList[finalTransform.src] = entryIdList[finalTransform.dest];
        entryIdList[finalTransform.dest] = heldOut;
        finalTransform.entry_ids = entryIdList;
        delete finalTransform.src;
        delete finalTransform.desc;
      }

      //make transformation call
      const response = await APIRequest(
        "POST",
        `/api/v2/${payload.dataset}/table_def/`,
        {
          transformation: finalTransform,
        }
      );
      baseRet = response;
    }
    //reload the table
    const rslt = await thunkApi.dispatch(
      loadTableDef({ dataset: payload.dataset })
    );
    return {
      ...rslt,
      stagedTransformations: [],
    };
  }
);

export const applyTransformation = createAsyncThunk(
  "table/applyTransformation",
  async (
    payload: { transformation: Transformation; dataset: string },
    thunkApi
  ) => {
    await APIRequest("POST", `/api/v2/${payload.dataset}/table_def/`, {
      transformation: payload.transformation,
    });
    const rslt = await thunkApi.dispatch(
      loadTableDef({ dataset: payload.dataset })
    );
    return rslt;
  }
);

export const tableSlice = createSlice({
  name: "cohort",
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    resetTableStatus(state) {
      state.tableStatus = "idle";
    },
    setTablePage(state, action) {
      state.tablePage = action.payload.page;
    },
    clearColumnInformation(state) {
      state.editColumn = undefined;
    },
    clearAggregateOptions(state) {
      state.aggregateOptions = [];
    },
    stageColumnsForEditing(state) {
      state.stageColumns = state.columns?.map((d) => {
        return { permanent_id: d.conceptId, name: d.name, entry_id: d.entryId };
      });
    },
    clearStagedColumns(state) {
      state.stageColumns = undefined;
      state.stagedTransformations = undefined;
    },
    addStageView(state, action) {
      const newCols = [...action.payload.columns];
      newCols.push(action.payload.concept);
      state.stageColumns = newCols;
    },
    removeStageView(state, action) {
      //if entry_id exists, then it has been loaded from api we just remove the matching one
      if (action.payload.item.entry_id) {
        state.stageColumns = [...action.payload.columns].filter(
          (d) => d.entry_id != action.payload.item.entry_id
        );
      }
      //if not, then we remove the first permanent_id match that doesnt have an entry_id
      else {
        const newCols = [...action.payload.columns];
        newCols.splice(
          action.payload.columns.findIndex(
            (d: Transformation) =>
              d.permanent_id == action.payload.item.permanent_id && !d.entry_id
          ),
          1
        );
        state.stageColumns = newCols;
      }
    },
    reorderStageView(state, action) {
      state.stageColumns = action.payload.columns;
    },
  },
  extraReducers: (builder) => {
    [
      loadTableDef,
      loadColumnInformation,
      loadAggregateOptions,
      addStageTransformation,
      applyStageTransformations,
      applyTransformation,
    ].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.tableStatus = "loading";
        })
        .addCase(thunk.fulfilled, (state, action) => {
          return { ...state, ...action.payload, tableStatus: "done" };
        })
        .addCase(thunk.rejected, (state, action) => {
          state.tableStatus = "failed";
          state.errors =
            action.error && action.error.message
              ? [action.error.message]
              : ["Report failed to load"];
          state.warnings = [];
          state.results = undefined;
          state.columns = undefined;
        });
    });
  },
});

export const {
  resetTableStatus,
  clearColumnInformation,
  clearAggregateOptions,
  clearStagedColumns,
  stageColumnsForEditing,
  setTablePage,
  addStageView,
  removeStageView,
  reorderStageView,
} = tableSlice.actions;

export default tableSlice.reducer;
