import { useAppDispatch, useAppSelector } from '../store/hooks'
import { useRecalculateMutation } from '../store/api/forecastApi'
import { closeRecalcDialog, setDirtyFlag } from '../store/workspaceSlice'

export function RecalcDialog() {
  const dirtyFlag = useAppSelector((s) => s.workspace.dirtyFlag)
  const recalcDialogOpen = useAppSelector((s) => s.workspace.recalcDialogOpen)
  const sessionId = useAppSelector((s) => s.workspace.sessionId)
  const dispatch = useAppDispatch()
  const [recalculate, { isLoading }] = useRecalculateMutation()

  if ((!dirtyFlag && !recalcDialogOpen) || !sessionId) return null

  const handleRecalc = async () => {
    try {
      await recalculate(sessionId).unwrap()
      dispatch(setDirtyFlag(false))
      dispatch(closeRecalcDialog())
    } catch (err) {
      console.error('Failed to recalculate forecasts', err)
    }
  }

  const handleLater = () => {
    dispatch(closeRecalcDialog())
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleLater}>
      <div
        className="modal recalc-dialog"
        role="dialog"
        aria-labelledby="recalc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="recalc-title">Inputs Changed</h3>
        <p>You have unsaved overrides. Would you like to recalculate forecasts now?</p>
        <div className="modal__foot" style={{ marginTop: '1.25rem', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn--ghost" onClick={handleLater}>
            Later
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={isLoading}
            onClick={handleRecalc}
          >
            {isLoading ? 'Recalculating…' : 'Recalculate Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

