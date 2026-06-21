import { Input } from './Input'

const labelClass = "block text-sm font-medium text-slate-300 mb-1"
const labelMutedClass = "block text-sm font-medium text-slate-500 mb-1"
const inputClass = "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"

interface AddressValues {
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
}

interface Props {
  defaultValues?: AddressValues
  required?: boolean
}

export function AddressFields({ defaultValues, required }: Props) {
  const req = required ?? false
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="logradouro" className={req ? labelClass : labelMutedClass}>
            Logradouro {req && '*'}
          </label>
          <Input
            id="logradouro"
            name="logradouro"
            required={req}
            defaultValue={defaultValues?.logradouro}
            placeholder="Rua, Av., Travessa..."
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="numero" className={req ? labelClass : labelMutedClass}>
            Número {req && '*'}
          </label>
          <Input
            id="numero"
            name="numero"
            required={req}
            defaultValue={defaultValues?.numero}
            placeholder="Ex: 123"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="complemento" className={labelMutedClass}>Complemento</label>
          <Input
            id="complemento"
            name="complemento"
            defaultValue={defaultValues?.complemento}
            placeholder="Apto, Bloco..."
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="bairro" className={req ? labelClass : labelMutedClass}>
            Bairro {req && '*'}
          </label>
          <Input
            id="bairro"
            name="bairro"
            required={req}
            defaultValue={defaultValues?.bairro}
            placeholder="Ex: Centro"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label htmlFor="cep" className={labelMutedClass}>CEP</label>
          <Input
            id="cep"
            name="cep"
            defaultValue={defaultValues?.cep}
            placeholder="00000-000"
            className={inputClass}
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="cidade" className={req ? labelClass : labelMutedClass}>
            Cidade {req && '*'}
          </label>
          <Input
            id="cidade"
            name="cidade"
            required={req}
            defaultValue={defaultValues?.cidade}
            placeholder="Ex: Tauá"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="uf" className={req ? labelClass : labelMutedClass}>
            UF {req && '*'}
          </label>
          <Input
            id="uf"
            name="uf"
            required={req}
            maxLength={2}
            defaultValue={defaultValues?.uf}
            placeholder="CE"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
