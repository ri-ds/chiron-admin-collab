import { Button, Typography } from "@mui/material";
import type { Concept } from ".";
import { styled } from "@mui/material/styles";
import { grey } from "@mui/material/colors";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  loadConceptDisplay,
  selectQueryConcept,
} from "../../store/cohortSlice";
import { addStageTransformation, addStageView } from "../../store/tableSlice";
import {
  addStageTransformation as addAggStageTransformation,
  addStageView as addAggStageView,
} from "../../store/aggregateSlice";
import config from "../../config";
import LockIcon from "@mui/icons-material/Lock";

type ConceptProps = {
  concept: Concept;
  conceptType: "cohort" | "table" | "analysis";
  selected?: string[];
};

const ConceptButton = styled(Button)(() => ({
  justifyContent: "start",
  textTransform: "none",
  color: grey[900],
  borderRadius: 0,
  overflowX: "hidden",
  width: "100%",
  textAlign: "left",
}));

export default function Concept({ concept, conceptType }: ConceptProps) {
  const dispatch = useAppDispatch();
  const queryConcept = useAppSelector((state) => state.cohort.queryConcept);
  const showDataType = useAppSelector((state) => state.cohort.showDataType);
  const columns = useAppSelector((state) => state.table.stageColumns);
  const aggColumns = useAppSelector((state) => state.aggregate.stageColumns);
  const aggRows = useAppSelector((state) => state.aggregate.stageRows);
  const dataset = useAppSelector((state) => state.auth.dataset?.unique_id);
  const stageTransforms = useAppSelector(
    (state) => state.table.stagedTransformations
  );
  const aggStageTransforms = useAppSelector(
    (state) => state.aggregate.stagedTransformations
  );

  const aggSelect: "Rows" | "Columns" | undefined = useAppSelector(
    (state) => state.aggregate.modalView
  );
  let isSelected: undefined | boolean = queryConcept === concept.permanent_id;

  //hiding based on concept settings
  const showString: string = `include_in_${conceptType}_def`;
  type ObjectKey = keyof typeof concept;
  const showProp = showString as ObjectKey;

  if (conceptType == "table") {
    isSelected = columns?.some(
      (column) => column.entry_id === concept.permanent_id
    );
  }
  //in analysis view
  //we combine the rows and columns to highlight so you cannot have same element in rows and columns
  if (conceptType == "analysis") {
    isSelected = aggColumns
      .concat(aggRows)
      .some((column) => column.permanent_id === concept.permanent_id);
  }

  return (
    <ConceptButton
      fullWidth
      sx={{
        bgcolor: isSelected ? config.table.secondaryHeaderColor[50] : "inherit",
        color: isSelected ? "black" : "inherit",
        ":hover": {
          bgcolor: isSelected
            ? config.table.secondaryHeaderColor[100]
            : config.table.secondaryHeaderColor[50],
          color: isSelected ? "black" : "inherit",
        },
        display: concept[showProp] ? "" : "none",
      }}
      title={concept.name}
      onClick={() => {
        dispatch(
          selectQueryConcept({
            dataset: dataset ? dataset : "",
            conceptId: concept.permanent_id,
            edit: undefined,
            conceptType,
          })
        );

        if (conceptType === "cohort") {
          dispatch(
            loadConceptDisplay({
              dataset: dataset ? dataset : "",
              conceptId: concept.permanent_id,
              showDataType,
            })
          );
        } else {
          if (!isSelected) {
            if (conceptType == "table") {
              dispatch(addStageView({ columns, concept }));
              dispatch(
                addStageTransformation({
                  stagedTransformations: stageTransforms,
                  newAction: {
                    type: "add_entry",
                    concept_id: concept.permanent_id,
                  },
                })
              );
            }
            if (conceptType == "analysis") {
              if (aggSelect == "Rows" || aggSelect == "Columns") {
                dispatch(
                  addAggStageView({
                    items: aggSelect == "Rows" ? aggRows : aggColumns,
                    concept: concept,
                    itemtype: aggSelect == "Rows" ? "rows" : "cols",
                  })
                );
                dispatch(
                  addAggStageTransformation({
                    stagedTransformations: aggStageTransforms,
                    newAction: {
                      type: "add_entry",
                      concept_id: concept.permanent_id,
                      role: aggSelect == "Rows" ? "rows" : "cols",
                    },
                  })
                );
              } else {
                null;
              }
            }
          }
        }
      }}
    >
      <Typography>{concept.name} </Typography>
      {concept.has_phi ? <LockIcon fontSize="small"></LockIcon> : null}
    </ConceptButton>
  );
}
