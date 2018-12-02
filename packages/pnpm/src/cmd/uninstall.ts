import {
  mutateModules,
  uninstall,
} from 'supi'
import createStoreController from '../createStoreController'
import { PnpmOptions } from '../types'

export default async function uninstallCmd (
  input: string[],
  opts: PnpmOptions,
) {
  const store = await createStoreController(opts)
  const uninstallOpts = Object.assign(opts, {
    store: store.path,
    storeController: store.ctrl,
  })
  if (opts.shrinkwrapDirectory !== opts.prefix) {
    return mutateModules([
      {
        bin: opts.bin,
        mutation: 'uninstallSome',
        prefix: opts.prefix,
        targetDependencies: input,
      },
    ], uninstallOpts)
  }
  return uninstall(input, uninstallOpts)
}
