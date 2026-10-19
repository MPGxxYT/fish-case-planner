# Fish Case Planner

Planning top-down layouts for a fish display case: which Pans go where, and which Products fill them.

## Language

**Case**:
The physical display case, viewed from above. Front is the customer glass side, back is the employee side.
_Avoid_: Display, counter

**Case width**:
How many width units the Case spans left to right. Depth is fixed at 12 units.

**Pan**:
A container placed across the Case width, 3, 6, 8 or 12 units wide, split front to back into one, two or three Slots.

**Slot**:
One front-to-back section of a Pan that holds at most one Product.
_Avoid_: Cell, spot

**Divider**:
A marker placed in the gap after a Pan (or at the start of the Case) to separate groups of Pans.

**Layout**:
The Case currently being edited: its Pans in order, its Case width and its Dividers. Undo and redo step through Layouts.
_Avoid_: Current case, board

**Saved Case**:
A named copy of a Layout kept for loading later.
_Avoid_: Template, save

**Published Case**:
A Saved Case shared to the server under a short code so coworkers can load it.

**Product**:
A catalog item (a fish or shellfish offering) that can be assigned to Slots.
