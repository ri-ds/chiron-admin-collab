import {
  type NumberConceptDetailedData,
  addQueryConceptToFilters,
  type NumberValues,
} from "../../store/cohortSlice";
import Box from "@mui/material/Box";
import { generateHistogramData } from "../../lib/utils";
import { Chip, Paper, TextField } from "@mui/material";
import { grey } from "@mui/material/colors";
import QueryConceptAddOrUpdateButton from "../QueryConceptAddOrUpdateButton";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SyntheticEvent } from "react";
import QueryConceptExcludeSwitch from "../QueryConceptExcludeSwitch";

import {
  ChartsTooltip,
  ResponsiveChartContainer,
  ChartsXAxis,
  BarPlot,
  ChartsYAxis,
} from "@mui/x-charts";
import config from "../../config";

function DataDisplay({
  name,
  value,
}: {
  name: string;
  value: string | number;
}) {
  return (
    <div>
      <Chip label={name} sx={{ borderRadius: 0 }} />
      <Chip
        label={Number(value).toLocaleString()}
        sx={{
          fontWeight: "bold",
          background: "inherit",
          border: "1px solid",
          borderColor: grey[300],
          borderRadius: 0,
          borderCollapse: "collapse",
        }}
      />
    </div>
  );
}

export default function NumberDisplay({
  data,
}: {
  data: NumberConceptDetailedData;
}) {
  const translatedData = generateHistogramData(data.histogram_data);
  const dispatch = useAppDispatch();
  const dataset = useAppSelector((state) => state.auth.dataset?.unique_id);
  const values = useAppSelector(
    (state) => state.cohort.queryConceptValues as NumberValues
  );
  const queryConceptData = useAppSelector(
    (state) => state.cohort.queryConceptData
  );
  const queryConceptEditing = useAppSelector(
    (state) => state.cohort.queryConceptEditing
  );
  const queryConceptExclude = useAppSelector(
    (state) => state.cohort.queryConceptExclude
  );
  const queryConceptEditingPrefilterValue = useAppSelector(
    (state) => state.cohort.queryConceptEditingPrefilterValue
  );
  /**
   * Adds the values into the filters
   *
   * @param e HTML Event
   */
  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const min = formData.get("min");
    const max = formData.get("max");

    dispatch(
      addQueryConceptToFilters({
        dataset: dataset ? dataset : "",
        conceptId: queryConceptData?.permanent_id || "",
        values: { cd_numeric_min: min || "", cd_numeric_max: max || "" },
        include_null_and_missing:
          queryConceptData?.cohort_def_options.include_null_and_missing,
        entry: queryConceptEditing,
        exclude: queryConceptExclude,
        prefilterValue: queryConceptEditingPrefilterValue,
        ignoreWarnings: false,
      })
    );
  }

  return (
    <Box display="flex" flexDirection="column" px={2} my={2}>
      <form onSubmit={handleSubmit}>
        <Box
          sx={{ display: { sm: "", md: "flex" } }}
          justifyContent="space-between"
          alignItems="center"
          p={2}
        >
          <Box display="flex" gap={2}>
            <TextField
              label="Min Value"
              name="min"
              size="small"
              InputLabelProps={{ shrink: true }}
              placeholder={
                data.stats.min != undefined ? data.stats.min.toString() : ""
              }
              defaultValue={values?.existing_min || ""}
            />
            <TextField
              label="Max Value"
              name="max"
              size="small"
              InputLabelProps={{ shrink: true }}
              placeholder={data.stats.max ? data.stats.max.toString() : ""}
              defaultValue={values?.existing_max || ""}
            />
          </Box>
          <Box sx={{ display: { xs: "", sm: "flex" } }} alignItems="center">
            <QueryConceptExcludeSwitch />
            <Box ml={1}>
              <QueryConceptAddOrUpdateButton />
            </Box>
          </Box>
        </Box>
      </form>
      <Box display="flex" justifyContent="center" gap={2} p={2}>
        <DataDisplay name="Entries:" value={data.stats.count_non_null} />

        <DataDisplay name="Min:" value={data.stats.min} />
        <DataDisplay name="Mean:" value={data.stats.avg} />
        <DataDisplay name="Max:" value={data.stats.max} />
      </Box>
      {translatedData?.values.length ? (
        <Paper sx={{ height: { sm: 200, md: 500 }, minWidth: 200 }}>
          <ResponsiveChartContainer
            series={[
              {
                data: translatedData.values,
                type: "bar",
                color: config.table.secondaryColor,
                yAxisKey: "yAxis",
              },
            ]}
            xAxis={[
              {
                scaleType: "band",
                data: translatedData.labels,
                id: "x-axis-id",
              },
            ]}
            yAxis={[{ scaleType: "linear", id: "yAxis" }]}
          >
            <ChartsTooltip />

            <BarPlot tooltip={{ trigger: "item" }} />
            <ChartsYAxis position="left" axisId="yAxis"></ChartsYAxis>
            <ChartsXAxis
              label={queryConceptData?.name || "Data"}
              position="bottom"
              axisId="x-axis-id"
            />
          </ResponsiveChartContainer>
        </Paper>
      ) : null}
    </Box>
  );
}
