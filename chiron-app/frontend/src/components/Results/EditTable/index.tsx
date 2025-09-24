import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  List,
  Typography,
} from "@mui/material";
import Concepts from "../../Concepts";
import { styled } from "@mui/material/styles";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { red } from "@mui/material/colors";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

import {
  Remove as RemoveIcon,
  DragIndicator as DragIndicatorIcon,
} from "@mui/icons-material";
import {
  addStageTransformation,
  applyStageTransformations,
  clearStagedColumns,
  removeStageView,
  reorderStageView,
} from "../../../store/tableSlice";
import config from "../../../config";

const ColumnBar = styled(Box)(() => ({
  border: "1px solid",
  borderColor: config.table.conceptHeaderColor[400],
  backgroundColor: config.table.conceptHeaderColor[50],
  padding: "0.25rem 0.25rem 0.25rem 0.75rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 4,
}));

export default function EditTable() {
  const columns = useAppSelector((state) => state.table.stageColumns);
  const dataset = useAppSelector((state) => state.auth.dataset?.unique_id);
  const tableStatus = useAppSelector((state) => state.table.tableStatus);
  const stageTransforms = useAppSelector(
    (state) => state.table.stagedTransformations
  );
  const dispatch = useAppDispatch();

  function handleClose() {
    dispatch(clearStagedColumns());
  }

  function onDragEnd(result: DropResult) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const newCols = columns ? [...columns] : [];
    const heldOut = newCols[result.destination.index];
    newCols[result.destination.index] = newCols[result.source.index];
    newCols[result.source.index] = heldOut;
    dispatch(
      reorderStageView({
        columns: newCols,
      })
    );
    dispatch(
      addStageTransformation({
        stagedTransformations: stageTransforms,
        newAction: {
          type: "resort_columns",
          src: result.source.index,
          dest: result.destination.index,
        },
      })
    );
  }

  return (
    <Dialog
      onClose={handleClose}
      open={Boolean(columns?.length) || false}
      maxWidth="lg"
      sx={{
        "& .MuiDialog-container": {
          "& .MuiPaper-root": {
            width: "100%",
            maxWidth: "80%",
          },
        },
      }}
    >
      <DialogContent>
        <Box display="flex" width="100%">
          <Box height="100%">
            <Concepts conceptType="table" />
          </Box>
          <Box width="100%" p={2} overflow="auto">
            <Typography variant="h6">Selected Columns</Typography>
            {tableStatus == "done" ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId={`aggregate-modal_ResultsCols`}>
                  {(provided) => (
                    <List
                      className={`aggregate-modal_ResultsCols`}
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {columns?.map((item, idx) => (
                        <Draggable
                          key={
                            item.entry_id
                              ? item.entry_id
                              : item.permanent_id + "-" + idx
                          }
                          draggableId={
                            item.entry_id
                              ? item.entry_id
                              : item.permanent_id + "-" + idx
                          }
                          index={idx}
                        >
                          {(provided) => (
                            <div
                              key={idx}
                              ref={provided.innerRef}
                              {...provided.dragHandleProps}
                              {...provided.draggableProps}
                            >
                              <ColumnBar>
                                <Typography>{item.name}</Typography>
                                <Box>
                                  <IconButton
                                    size="small"
                                    sx={{
                                      bgcolor: red[600],
                                      color: "white",
                                      p: 0,
                                      ":hover": { bgcolor: red[400] },
                                    }}
                                    onClick={() => {
                                      dispatch(
                                        removeStageView({ columns, item })
                                      );
                                      const act = {
                                        type: "delete_entry",
                                        concept_id: item.permanent_id,
                                        entry_id: item.entry_id,
                                      };
                                      dispatch(
                                        addStageTransformation({
                                          stagedTransformations:
                                            stageTransforms,
                                          newAction: act,
                                        })
                                      );
                                    }}
                                  >
                                    <RemoveIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" color="inherit">
                                    <DragIndicatorIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </ColumnBar>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </List>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <CircularProgress size={100} />
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            dispatch(
              applyStageTransformations({
                stagedTransformations: stageTransforms ? stageTransforms : [],
                dataset: dataset ? dataset : "",
              })
            ).then(() => {
              handleClose();
            });
          }}
        >
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
}
