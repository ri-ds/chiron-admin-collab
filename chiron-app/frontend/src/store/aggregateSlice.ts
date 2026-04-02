import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { APIFileRequest, APIRequest } from "../api";
import { GridColDef, GridColumnGroupingModel } from "@mui/x-data-grid";
import { cleanDataSet } from "../components/Aggregate/TableDataFormatter";
import { StageTableItem, Transformation } from "./tableSliceTypes";
export interface AggregateState {
  aggStatus: "idle" | "loading" | "failed" | "done";
  stageColumns: StageTableItem[];
  stageRows: StageTableItem[];
  columns: AggTableItem[];
  rows: AggTableItem[];
  modalView?: "Rows" | "Columns" | undefined;
  warnings: string[];
  errors: string[];
  dataset?:
    | {
        columns?: GridColDef[];
        columnGroups?: GridColumnGroupingModel;
        columnMetaGroups?: GridColumnGroupingModel;
        //should be GridRowsProp but causing type error with mui pro v7 upgrade
        data?: any | []; // eslint-disable-line  @typescript-eslint/no-explicit-any
      }
    | undefined;
  stagedTransformations?: Transformation[];
}
export type AggTableItem = {
  id: string;
  entryId: string;
  conceptId: string;
  name: string;
};

type ApiTableItem = {
  entry_id: string;
  concept_id: string;
  label: string;
};

function prepareAggTableItem(apiTableItem: ApiTableItem) {
  return {
    entryId: apiTableItem.entry_id,
    conceptId: apiTableItem.concept_id,
    name: apiTableItem.label,
  };
}
const initialState: AggregateState = {
  aggStatus: "idle",
  warnings: [],
  errors: [],
  stageColumns: [],
  stageRows: [],
  columns: [],
  rows: [],
};

export const loadAggregateResults = createAsyncThunk(
  "aggregate/loadAggregateResults",
  async ({
    dataset,
    rows,
    columns,
  }: {
    dataset: string;
    rows: AggTableItem[];
    columns: AggTableItem[];
  }) => {
    const response = await APIRequest(
      "GET",
      `/api/v2/${dataset}/analysis_tools/run_analysis/`
    );

    const analysisData = cleanDataSet(response.dataset, rows, columns);
    const result = {
      warnings: response.warnings,
      errors: response.errors,
      dataset: analysisData,
      aggStatus: "done",
    };
    return result;
  }
);

export const loadAggregateDef = createAsyncThunk(
  "aggregate/loadAggregateDef",
  async ({ dataset }: { dataset: string }, thunkApi) => {
    const response = await APIRequest(
      "GET",
      `/api/v2/${dataset}/analysis_def/`
    );
    const formattedRows =
      response?.extended_analysis_def?.rows.map(prepareAggTableItem);
    const formattedColumns =
      response?.extended_analysis_def?.cols.map(prepareAggTableItem);
    thunkApi.dispatch(
      loadAggregateResults({
        dataset: dataset,
        rows: formattedRows,
        columns: formattedColumns,
      })
    );

    const result = {
      warnings: response?.warnings,
      errors: response?.errors,
      rows: formattedRows ? formattedRows : [],
      columns: formattedColumns ? formattedColumns : [],
      aggStatus: "done",
      dataset: undefined,
    };
    return result;
  }
);

export const downloadCsvFile = createAsyncThunk(
  "table/downloadCsvFile",
  async ({ dataset }: { dataset: string }) => {
    await APIFileRequest(
      "GET",
      `/api/v2/${dataset}/analysis_tools/export_csv/?use_active_cohort=true`,
      "aggregate_export.csv"
    );
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
        `/api/v2/${payload.dataset}/analysis_def/`
      );
    } catch (error) {
      baseRet;
    }

    for (const transform of payload.stagedTransformations) {
      const finalTransform = { ...transform };

      //get the entry id to delete
      if (finalTransform.type == "delete_entry") {
        if (!finalTransform.entry_id) {
          finalTransform.entry_id = baseRet.extended_analysis_def.rows
            .concat(baseRet.extended_analysis_def.cols)
            .find(
              (t: Transformation) => t.concept_id == finalTransform.concept_id
            )?.entry_id;
        }
      }
      //get the new order of entry ids
      if (
        finalTransform.type == "move_entry" &&
        typeof finalTransform.index == "number" &&
        typeof finalTransform.src == "number" &&
        typeof finalTransform.role == "string"
      ) {
        const itemList =
          finalTransform.role == "rows"
            ? baseRet.extended_analysis_def.rows
            : baseRet.extended_analysis_def.cols;
        const entryIdList = itemList.map((t: Transformation) => t.entry_id);
        finalTransform.entry_id = entryIdList[finalTransform.src];
        delete finalTransform.src;
      }

      //make transformation call
      const response = await APIRequest(
        "POST",
        `/api/v2/${payload.dataset}/analysis_def/`,
        {
          transformation: finalTransform,
        }
      );
      baseRet = response;
    }
    //reload the table
    const rslt = await thunkApi.dispatch(
      loadAggregateDef({ dataset: payload.dataset })
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
    await APIRequest("POST", `/api/v2/${payload.dataset}/analysis_def/`, {
      transformation: payload.transformation,
    });
    const rslt = await thunkApi.dispatch(
      loadAggregateDef({ dataset: payload.dataset })
    );
    return rslt;
  }
);

export const aggSlice = createSlice({
  name: "aggregate",
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    stageAggItemsForEditing(state, action) {
      state.stageColumns = state.columns.map((d) => {
        return { permanent_id: d.conceptId, name: d.name, entry_id: d.entryId };
      });
      state.stageRows = state.rows.map((d) => {
        return { permanent_id: d.conceptId, name: d.name, entry_id: d.entryId };
      });
      state.modalView = action.payload;
    },
    toggleModalView(state, action) {
      state.modalView = action.payload;
      if (!action.payload) {
        state.stageColumns = [];
        state.stageRows = [];
      }
    },
    resetAggState(state) {
      state.columns = [];
      state.stageColumns = [];
      state.rows = [];
      state.stageRows = [];
      state.modalView = undefined;
      state.aggStatus = "idle";
    },
    addStageView(state, action) {
      const newItems = [...action.payload.items];
      newItems.push(action.payload.concept);
      action.payload.itemtype == "cols"
        ? (state.stageColumns = newItems)
        : (state.stageRows = newItems);
    },
    removeStageView(state, action) {
      let newItems = [...action.payload.items];
      //if entry_id exists, then it has been loaded from api we just remove the matching one
      if (action.payload.item.entry_id) {
        newItems = newItems.filter(
          (d) => d.entry_id != action.payload.item.entry_id
        );
      }
      //if not, then we remove the first permanent_id match that doesnt have an entry_id
      else {
        newItems.splice(
          action.payload.items.findIndex(
            (d: Transformation) =>
              d.permanent_id == action.payload.item.permanent_id && !d.entry_id
          ),
          1
        );
      }
      action.payload.itemtype == "cols"
        ? (state.stageColumns = newItems)
        : (state.stageRows = newItems);
    },
    reorderStageView(state, action) {
      action.payload.itemtype == "cols"
        ? (state.stageColumns = action.payload.items)
        : (state.stageRows = action.payload.items);
    },
  },

  // The `extraReducers` field lets the slice handle actions defined elsewhere,
  // including actions generated by createAsyncThunk or in other slices.
  extraReducers: (builder) => {
    [
      loadAggregateDef,
      loadAggregateResults,
      downloadCsvFile,
      addStageTransformation,
      applyStageTransformations,
      applyTransformation,
    ].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.aggStatus = "loading";
        })
        .addCase(thunk.fulfilled, (state, action) => {
          return { ...state, ...action.payload, aggStatus: "done" };
        })
        .addCase(thunk.rejected, (state, action) => {
          state.aggStatus = "failed";
          state.errors =
            action.error && action.error.message
              ? [action.error.message]
              : ["Aggregate failed to load"];
          state.warnings = [];
          state.columns = [];
        });
    });
  },
});

export const {
  stageAggItemsForEditing,
  toggleModalView,
  resetAggState,
  reorderStageView,
  removeStageView,
  addStageView,
} = aggSlice.actions;

export default aggSlice.reducer;
