import { css } from "lit";

export const styles = css`
  .dayButton[selected] {
    background: blue;
  }
  .dayButton[group] {
    background: aqua;
  }
  .dayChain[selected] {
    background: blue;
  }
  .dayChain[add] {
    background: green;
  }
  .dayChain[remove] {
    background: red;
  }
`;
