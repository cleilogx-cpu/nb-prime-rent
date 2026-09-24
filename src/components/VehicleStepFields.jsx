/**
 * Bloco "Veículo" -- extraído de ContractForm.jsx (Fase 2 do Contrato
 * Inteligente) pra ser reaproveitado tanto no formulário de edição quanto
 * na etapa "Locação" do wizard de novo contrato, sem duplicar a lógica de
 * seleção (que já vem com o preenchimento automático de initial_km).
 */
export default function VehicleStepFields({ vehicles, vehicleId, onSelectVehicle, selectedVehicle, error }) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Veículo</p>
      <select
        value={vehicleId}
        onChange={(event) => onSelectVehicle(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="">Selecione um veículo cadastrado</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.plate} — {vehicle.model} ({vehicle.status})
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}

      {selectedVehicle ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p>{selectedVehicle.model} · {selectedVehicle.color} · {selectedVehicle.year || 'ano não informado'}</p>
          <p className="mt-1 text-xs text-slate-500">Chassi: {selectedVehicle.chassis || 'não informado'} · Km atual: {selectedVehicle.current_km ?? 'não informado'}</p>
        </div>
      ) : null}
    </div>
  )
}
