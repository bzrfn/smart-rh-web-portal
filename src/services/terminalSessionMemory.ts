export type TerminalSessionMemory = {
  token:
    string;

  terminalId:
    string;

  source:
    | 'admin-direct'
    | 'approved-device';
};

let terminalSessionMemory:
  TerminalSessionMemory |
  null =
  null;

export function setTerminalSessionMemory(
  session:
    TerminalSessionMemory
) {
  terminalSessionMemory = {
    ...session,
  };
}

export function getTerminalSessionMemory():
  TerminalSessionMemory |
  null {
  return terminalSessionMemory
    ? {
        ...terminalSessionMemory,
      }
    : null;
}

export function clearTerminalSessionMemory() {
  terminalSessionMemory =
    null;
}
