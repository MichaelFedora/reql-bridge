export function safen(value: any) {
  switch(typeof(value)) {
    case 'number':
      return value;
    case 'string':
    case 'object':
    default:
      let str = JSON.stringify(value).replace(/'/g, '\'\'').replace(/\\"/g, '"').replace(/^"|"$/g, '\'');
      if(str[0] !== '\'') str = '\'' + str;
      if(str[str.length - 1] !== '\'') str += '\'';
      return str;
  }
}
