import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  List,
  ListItem,
  Typography,
} from "@mui/material";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

import Concepts from "../../Concepts";
import { styled } from "@mui/material/styles";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { red } from "@mui/material/colors";
import {
  Remove as RemoveIcon,
  DragIndicator as DragIndicatorIcon,
} from "@mui/icons-material";
import {
  removeStageView,
  addStageTransformation,
  toggleModalView,
  applyStageTransformations,
  reorderStageView,
} from "../../../store/aggregateSlice";
import config from "../../../config";

const ColumnBar = styled(ListItem)(() => ({
  border: "1px solid",
  borderColor: config.table.aggHeaderColor[400],
  backgroundColor: config.table.aggHeaderColor[50],
  padding: "0.25rem 0.25rem 0.25rem 0.75rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 4,
}));

export default function EditAggTable() {
  const dataset = useAppSelector((state) => state.auth.dataset?.unique_id);
  const columns = useAppSelector((state) => state.aggregate.stageColumns);
  const rows = useAppSelector((state) => state.aggregate.stageRows);
  const aggStatus = useAppSelector((state) => state.aggregate.aggStatus);
  const modalView = useAppSelector((state) => state.aggregate.modalView);
  const stageTransforms = useAppSelector(
    (state) => state.aggregate.stagedTransformations
  );

  const items =
    modalView == "Columns" ? columns : modalView == "Rows" ? rows : null;
  const dispatch = useAppDispatch();

  function handleClose() {
    dispatch(toggleModalView(undefined));
  }

  function onDragEnd(result: DropResult) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const newItems = items ? [...items] : [];
    const heldOut = newItems.splice(result.source.index, 1)[0];
    newItems.splice(result.destination.index, 0, heldOut);

    dispatch(
      reorderStageView({
        items: newItems,
        itemtype: modalView == "Rows" ? "rows" : "cols",
      })
    );
    dispatch(
      addStageTransformation({
        stagedTransformations: stageTransforms,
        newAction: {
          type: "move_entry",
          src: result.source.index,
          index: result.destination.index,
          role: modalView == "Rows" ? "rows" : "cols",
        },
      })
    );
  }

  return (
    <Dialog
      onClose={handleClose}
      open={modalView == undefined ? false : true}
      maxWidth="lg"
      sx={{
        "& .MuiDialog-container": {
          "& .MuiPaper-root": {
            width: "100%",
            maxWidth: "80%", // Set your width here
          },
        },
      }}
    >
      <DialogContent>
        <Box display="flex" width="100%">
          <Box height="100%">
            <Concepts conceptType="analysis" />
          </Box>

          <Box width="100%" p={2}>
            <Typography variant="h6">Selected {modalView}</Typography>
            {aggStatus == "done" ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId={`aggregate-modal_${modalView}`}>
                  {(provided) => (
                    <List
                      className={`aggregate-modal_${modalView}`}
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {items?.map((item, idx) => (
                        <Draggable
                          key={
                            item.entry_id
                              ? item.entry_id
                              : item.permanent_id + idx
                          }
                          draggableId={
                            item.entry_id
                              ? item.entry_id
                              : item.permanent_id + idx
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
                                        removeStageView({
                                          items: items,
                                          item: item,
                                          itemtype:
                                            modalView == "Rows"
                                              ? "rows"
                                              : "cols",
                                        })
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
