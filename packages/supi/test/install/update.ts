import { WANTED_LOCKFILE } from '@pnpm/constants'
import { Lockfile } from '@pnpm/lockfile-file'
import prepare from '@pnpm/prepare'
import path = require('path')
import readYamlFile from 'read-yaml-file'
import { addDependenciesToPackage, install } from 'supi'
import tape = require('tape')
import promisifyTape from 'tape-promise'
import {
  addDistTag,
  testDefaults,
} from '../utils'

const test = promisifyTape(tape)
const testOnly = promisifyTape(tape.only)

test('preserve subdeps on update', async (t: tape.Test) => {
  const project = prepare(t)

  await Promise.all([
    addDistTag('abc-grand-parent-with-c', '1.0.0', 'latest'),
    addDistTag('abc-parent-with-ab', '1.0.0', 'latest'),
    addDistTag('bar', '100.0.0', 'latest'),
    addDistTag('foo', '100.0.0', 'latest'),
    addDistTag('foobarqar', '1.0.0', 'latest'),
    addDistTag('peer-c', '1.0.0', 'latest'),
  ])

  await addDependenciesToPackage(['foobarqar', 'abc-grand-parent-with-c'], await testDefaults())

  await Promise.all([
    addDistTag('abc-grand-parent-with-c', '1.0.1', 'latest'),
    addDistTag('abc-parent-with-ab', '1.0.1', 'latest'),
    addDistTag('bar', '100.1.0', 'latest'),
    addDistTag('foo', '100.1.0', 'latest'),
    addDistTag('foobarqar', '1.0.1', 'latest'),
  ])

  await install(await testDefaults({ update: true, depth: 0 }))

  const lockfile = await project.loadLockfile()

  t.ok(lockfile.packages)
  t.ok(lockfile.packages['/abc-parent-with-ab/1.0.0_peer-c@1.0.0'], 'preserve version of package that has resolved peer deps')
  t.ok(lockfile.packages['/foobarqar/1.0.1'])
  t.deepEqual(lockfile.packages['/foobarqar/1.0.1'].dependencies, {
    bar: '100.0.0',
    foo: '100.0.0',
    qar: '100.0.0',
  })
})

test('update does not fail when package has only peer dependencies', async (t: tape.Test) => {
  prepare(t)

  await addDependenciesToPackage(['has-pkg-with-peer-only'], await testDefaults())

  await install(await testDefaults({ update: true, depth: Infinity }))

  t.pass('did not fail')
})

test('update does not install the package if it is not present in package.json', async (t: tape.Test) => {
  const project = prepare(t)

  await addDependenciesToPackage(['is-positive'], await testDefaults({
    allowNew: false,
    update: true,
  }))

  await project.hasNot('is-positive')
})

test('update dependency when external lockfile directory is used', async (t: tape.Test) => {
  const project = prepare(t)

  await addDistTag('foo', '100.0.0', 'latest')

  const lockfileDirectory = path.resolve('..')
  await addDependenciesToPackage(['foo'], await testDefaults({ lockfileDirectory }))

  await addDistTag('foo', '100.1.0', 'latest')

  await install(await testDefaults({ update: true, depth: 0, lockfileDirectory }))

  const lockfile = await readYamlFile<Lockfile>(path.join('..', WANTED_LOCKFILE))

  t.ok(lockfile.packages && lockfile.packages['/foo/100.1.0']) // tslint:disable-line:no-string-literal
})
