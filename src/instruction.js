export const INUMBER = 'INUMBER'
export const IOP1 = 'IOP1'
export const IOP2 = 'IOP2'
export const IOP3 = 'IOP3'

export const IVAR = 'IVAR'
export const IVARNAME = 'IVARNAME'
export const IVARNAME_MEMBER = 'IVARNAME_MEMBER'

export const IFUNDEF = 'IFUNDEF'
export const IFUNDEFANON = 'IFUNDEFANON'
export const IFUNCALL = 'IFUNCALL'
export const IFUNAPPLY = 'IFUNAPPLY'

export const IEXPR = 'IEXPR'

export const IARRAY = 'IARRAY'
export const IOBJECT = 'IOBJECT'
export const IMEMBER = 'IMEMBER'
export const ISPREAD = 'ISPREAD'

export const IENDSTATEMENT = 'IENDSTATEMENT'
export const IRETURN = 'IRETURN'
export const IEXPREVAL = 'IEXPREVAL'

export class Instruction {
  constructor(type, value) {
    this.type = type
    this.value = (value !== undefined && value !== null) ? value : 0
  }
  toString(indent = 0) {
    return toString(this.type, this.value, indent)
  }
}

function toString(type, value, indent) {
  switch (type) {
  case INUMBER:
    if (typeof value === 'boolean')
      return 'Boolean ' + value
    if (typeof value === 'string')
      return 'String ' + value
    return 'Number ' + value
  case IOP1:
    return 'Operation with 1 argument ' + value
  case IOP2:
    return 'Operation with 2 arguments ' + value
  case IOP3:
    return 'Operation with 3 arguments ' + value
  case IVAR:
    return 'Variable ' + value
  case IVARNAME:
    return 'Variable name ' + value
  case IEXPR:
    return 'Expression\n' + instrArrayToString(value, indent + 2) //+'\n'
  case IENDSTATEMENT:
    return 'End statement'// + value
  case IFUNCALL:
    return 'Call function with ' + value + ' argument' + plural(value)
  case IFUNDEF:
    return 'Define function with ' + value + ' argument' + plural(value)
  case IFUNDEFANON:
    return 'Define anonymous function with ' + value + ' argument' + plural(value)
  case IFUNAPPLY:
    return 'Apply to function ' + value
    //(typeof value==='string' ? value : 'to ' + value) //+ ' argument' + plural(value)
  case IMEMBER:
    return 'Member ' + value
  case IVARNAME_MEMBER:
    return 'Variable member ' + value.map(i => i.value).join('.')
  case IARRAY:
    return 'Array of ' + value + ' item' + plural(value)
  case IOBJECT:
    return 'Object with ' + value + ' key-value pair' + plural(value)
  default:
    return type + ' ' + value //'Invalid Instruction'
  }
}

function instrArrayToString(arr, indent = 2) {
  return arr.map(val => ' '.repeat(indent)+val.toString(indent)).join('\n')
}

function instrObjToString(obj, indent = 2) {
  return Object.keys(obj).map(key => ' '.repeat(indent)+key.toString(indent)+': '+obj[key].toString(indent)).join('\n')
}

function plural(val) {
  return val > 1 ? 's' : ''
}


export function unaryInstruction(value) {
  return new Instruction(IOP1, value)
}

export function binaryInstruction(value) {
  return new Instruction(IOP2, value)
}

export function ternaryInstruction(value) {
  return new Instruction(IOP3, value)
}
