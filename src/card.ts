import { html, LitElement, TemplateResult, nothing } from "lit";
import { styles } from "./card.styles";
import { guard } from "lit/directives/guard";
import { repeat } from "lit/directives/repeat";
import { ifDefined } from "lit/directives/if-defined";
import { state } from 'lit/decorators';

import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant, LovelaceCardConfig } from "custom-card-helpers";
import { HassCallServiceResponse } from './utils/HassCallServiceResponse'

interface Config extends LovelaceCardConfig {
  header: string;
  entity: string;
}

interface TimeTemp {
  time: string,
  temp: number
}

interface DaysConfig {
  days: Array<number>,
  config: Array<TimeTemp>
}

interface OptionConfig {
  name: string,
  daysConfig: Array<DaysConfig>
}

var todoConfName = 'thermo_config';

interface TodoConfig {
  name: string,
  configs: Array<OptionConfig>
}

export class ToggleCardTypeScript extends LitElement {
  // properties to remember
  // private todoConfName = 'thermo_config';

  // internal reactive states
  @state() private _header: string | typeof nothing;
  @state() private _entity: string;
  @state() private _name: string;
  @state() private _state: HassEntity;
  @state() private _status: string;
  @state() private _options;

  // config from todo list
  @state() private _savedConfig: string;
  @state() private _updatedConfig: TodoConfig;
  @state() private _changesNotSaved = false;

  // config parts used for configuration
  private _manualOption = "Manual";
  private _createOption = "Create new";
  @state() private _selectedOption = this._manualOption;
  @state() private _tempOption = '';
  @state() private _dropDownOptions = [this._manualOption, this._createOption];
  // Day configuration
  // Day number 1 = Monday
  @state() private _selectedDay = 1;
  @state() private _weeDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  @state() private _chainedDays = [];
  @state() private _addChanedDay = false;
  @state() private _removeChanedDay = false;
  // private property
  private _hass;

  // declarative part
  static styles = styles;

  private hassCals = new HassCallServiceResponse();

  // lifecycle interface
  setConfig(config: Config) {
    this._header = config.header === "" ? nothing : config.header;
    this._entity = config.entity;
    // call set hass() to immediately adjust to a changed entity
    // while editing the entity in the card editor
    if (this._hass) {
      this.hass = this._hass;
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._state = hass.states[this._entity];
    if (this._state) {
      this._status = this._state.state;
      this._options = this._state.attributes.options;
      let fn = this._state.attributes.friendly_name;
      this._name = fn ? fn : this._entity;

      // get config from todo entity
      var message = {
        "type": "call_service",
        "domain": "todo",
        "service": "get_items",
        "target": { "entity_id": this._entity },
        "id": 1,
        "return_response": true
      };
      this._hass.callWS(message).then(response => {
        var asd = response;
      });

      if (this._updatedConfig === undefined) {
        this.initTodo();
      }
    }
  }

  render() {
    let content: TemplateResult;
    if (!this._state) {
      content = html` <p class="error">${this._entity} is unavailable.</p> `;
    } else {
      content = html`
        <table>
          <tbody>
            <tr>
              <td colspan="4">
                <select name="configs" id="configs" @change="${e => this.changeSelectedConfig(e.target.value)}">
                  ${repeat(this._dropDownOptions, item => html`
                      <option value="${item}" selected=${ifDefined(this._selectedOption === item ? "" : nothing)}>${item}</option>
                    `)}
                </select>
              </td>
              <td>
                <button disabled=${ifDefined(this.isRemovableOption() ? nothing : "disabled")} @click="${this.removeOption}">Remove option</button>
              </td>
              <td>
                <button disabled=${ifDefined(this._savedConfig ? nothing : "disabled")} @click="${this.resetUpdatedConfig}">Reset changes</button>
              </td>
              <td>
                <button disabled=${ifDefined(this._changesNotSaved ? nothing : "disabled")} @click="${this.saveConfigToHass}">Save changes</button>
              </td>
            </tr>
        ${guard([this._updatedConfig, this._selectedOption, this._changesNotSaved, this._selectedDay, this._chainedDays, this._addChanedDay, this._removeChanedDay], () => {
        if (this._selectedOption === this._manualOption) {
          return html`
          <tr>
            <td colspan="7">
              <label>Manual option add permission for user to set manually room temperature.</label>
            </td>
          </tr>`;
        } else if (this._selectedOption === this._createOption) {
          return html`
                      <tr>
                        <td colspan="6">
                          <input @change="${e => this.addNewTempOption(e.target.value)}"></input>
                        </td>
                        <td>
                          <button @click="${this.addNewOption}">Add new option</button>
                        </td>
                      </tr>
                `;
        } else {
          return html`
                          <tr>
                            ${repeat(this._weeDays, (day, index) => html`
                              <td>
                                <button
                                  class="dayButton"
                                  selected=${ifDefined(this._selectedDay === index + 1 ? "" : nothing)}
                                  group=${ifDefined(this._selectedDay !== index + 1 && this._chainedDays.indexOf(index + 1) >= 0 ? "" : nothing)}
                                  @click="${e => this.changeSelectedDay(index + 1)}"
                                >${day}</button>
                              </td>
                            `)}
                          </tr>
                          <tr>
                            <td>
                              <button
                              class="dayChain"
                              selected=${ifDefined(this._chainedDays.length > 1 ? "" : nothing)}
                              add=${ifDefined(this._addChanedDay ? "" : nothing)}
                              remove=${ifDefined(this._removeChanedDay ? "" : nothing)}
                              @click="${this.changeDayGroup}"
                              >Group days</button>
                            </td>
                            <td colspan="6" />
                          </tr>
                          ${repeat(this.getDayConfig(), (item, index) => html`
                            <tr>
                              <td colspan="3">
                                <input type="time" @change="${e => this.timeChanged(e.target.value, index)}" value="${item.time}" />
                              </td>
                              <td colspan="3">
                                <input type="number" min="10" max="30" step="0.5" @change="${e => this.tempChanged(e.target.value, index)}" value="${item.temp}" />
                              </td>
                              <td>
                                <button @click="${e => this.removeTimeTemp(index)}">Remove this</button>
                              </td>
                            </tr>
                          `)}
                          <tr>
                            <td colspan="6"/>
                            <td>
                              <button @click="${this.addNewTimeTemp}">Add new</button>
                            </td>
                          <tr>
                `;
        }
      })}
          </tbody>
        </table>
      `;
    }
    return html`
      <ha-card header="${this._header}">
        <div class="card-content">${content}</div>
      </ha-card>
    `;
  }

  updatedConfigChanged() {
    this._updatedConfig = structuredClone(this._updatedConfig);
  }

  getOptionConfig(): Array<DaysConfig> {
    return this._updatedConfig.configs.find(item => item.name === this._selectedOption).daysConfig;
  }

  getSelectedDay(): DaysConfig {
    var dayConfig = this.getOptionConfig().find(item => item.days.indexOf(this._selectedDay) > -1);
    if (dayConfig) {
      return dayConfig;
    }
    dayConfig = {
      days: [this._selectedDay],
      config: []
    }
    this.getOptionConfig().push(dayConfig);
    this.updatedConfigChanged();
    return dayConfig;
  }

  getDayConfig(): Array<TimeTemp> {
    return this.getSelectedDay().config;
  }

  isRemovableOption() {
    return this._selectedOption !== this._manualOption && this._selectedOption !== this._createOption;
  }

  removeOption() {
    var selectedOption = this._updatedConfig.configs.find(item => item.name === this._selectedOption);
    var optionIndex = this._updatedConfig.configs.indexOf(selectedOption);
    this._updatedConfig.configs.splice(optionIndex, 1);
    this.updatedConfigChanged();
    this._changesNotSaved = true;
    this._dropDownOptions.splice(this._dropDownOptions.indexOf(this._selectedOption), 1);
    this._dropDownOptions = [...this._dropDownOptions];
    this.changeSelectedConfig(this._manualOption);
  }

  changeDayGroup() {
    if (this._addChanedDay) {
      this._addChanedDay = false;
      this._removeChanedDay = true;
      return;
    }
    if (this._removeChanedDay) {
      this._removeChanedDay = false;
      return;
    }
    this._addChanedDay = true;
  }

  changeSelectedDay(day) {
    if (this._addChanedDay && this._chainedDays.indexOf(day) < 0) {
      this.addDayToChain(day);
    } else if (this._removeChanedDay) {
      this.removeDayFromChain(day);
    } else if (!this._addChanedDay && !this._removeChanedDay) {
      this.changeDayConfig(day);
    }
  }

  addDayToChain(day) {
    this._chainedDays.push(day);
    this._chainedDays = [...this._chainedDays];

    var option = this.getOptionConfig();
    var dayConfig = option.find(item => item.days.indexOf(day) > -1);
    if (dayConfig) {
      if (dayConfig.days.length === 1) {
        option.splice(option.indexOf(dayConfig), 1);
      } else {
        dayConfig.days.splice(dayConfig.days.indexOf(day), 1);
      }
    }
    this.getSelectedDay().days.push(day);
    this.updatedConfigChanged();
    this._changesNotSaved = true;
  }

  removeDayFromChain(day) {
    var dayIndex = this._chainedDays.indexOf(day);
    if (this._selectedDay === day || dayIndex < 0) {
      return;
    }
    this._chainedDays.splice(dayIndex, 1);
    this._chainedDays = [...this._chainedDays];

    var newDayConfig = {
      days: [day],
      config: structuredClone(this.getDayConfig())
    }
    this.getOptionConfig().push(newDayConfig);
    this.updatedConfigChanged();
    this._changesNotSaved = true;
  }

  changeDayConfig(day) {
    this._selectedDay = day;
    if (this._chainedDays.length > 1 && this._chainedDays.indexOf(day) > -1) {
      return;
    }

    var dayConfig = this.getSelectedDay();
    this._chainedDays = [...dayConfig.days];
  }

  addNewTempOption(newTempOption) {
    this._tempOption = newTempOption;
  }

  addNewOption() {
    if (this._tempOption.length === 0 || this._dropDownOptions.indexOf(this._tempOption) > 0) {
      return;
    }

    this._dropDownOptions.splice(this._dropDownOptions.length - 1, 0, this._tempOption);

    if (this._dropDownOptions.length > 3) {
      var sortedList = this._dropDownOptions.slice(1, this._dropDownOptions.length);
      sortedList = sortedList.sort();
      sortedList.unshift(this._manualOption);
      sortedList.push(this._createOption);
      this._dropDownOptions = [...sortedList];
    }

    var newOption = { name: this._tempOption, daysConfig: [] };
    this._updatedConfig.configs.push(newOption);

    this.changeSelectedConfig(this._tempOption);
    this._tempOption = '';
    this.updatedConfigChanged();
    this._changesNotSaved = true;
  }

  timeChanged(newValue, index) {
    var dayConfig = this.getDayConfig();
    var currentTimeTemp = dayConfig.at(index);
    currentTimeTemp.temp = newValue;
    this.getSelectedDay().config = [...dayConfig.sort((v1, v2) => this.compareTimeStrings(v1, v2))];
    this.updatedConfigChanged();
    this._changesNotSaved = true;
  }

  compareTimeStrings(v1, v2) {
    var time1 = parseInt(v1.time.replace(':', ''));
    var time2 = parseInt(v2.time.replace(':', ''));
    return time1 - time2;
  }

  tempChanged(newValue, index) {
    if (newValue < 10) {
      newValue = 10;
    }
    if (newValue > 30) {
      newValue = 30;
    }
    var dayConfig = this.getDayConfig();
    var currentTimeTemp = dayConfig.at(index);
    currentTimeTemp.temp = newValue;
    this.updatedConfigChanged();
    this._changesNotSaved = true;
  }

  removeTimeTemp(index) {
    this.getDayConfig().splice(index, 1);
    this.updatedConfigChanged();
    this._changesNotSaved = true;
  }

  addNewTimeTemp() {
    var dayConfig = this.getDayConfig();
    var lastIndex = dayConfig.length;
    var currentTimeTemp;
    if (lastIndex === 0) {
      currentTimeTemp = {
        time: "12:00",
        temp: 21
      };
    } else {
      currentTimeTemp = structuredClone(dayConfig.at(lastIndex - 1));
      currentTimeTemp.time = this.incrementTimeByOneMinute(currentTimeTemp.time);
    }

    dayConfig.push(currentTimeTemp);
    this.updatedConfigChanged();
    this._changesNotSaved = true;
  }

  incrementTimeByOneMinute(timeString) {
    const [hours, minutes] = timeString.split(':');
    let newMinutes = parseInt(minutes) + 1;

    if (newMinutes >= 60) {
      newMinutes -= 60;
      const newHours = parseInt(hours) + 1;
      return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }

    return `${hours}:${newMinutes.toString().padStart(2, '0')}`;
  }

  changeSelectedConfig(selectedOption) {
    this._selectedOption = selectedOption;
    if (this._selectedOption === this._manualOption || this._selectedOption === this._createOption) {
      return;
    }
    this._selectedDay = 1;
    var selectedDay = this.getSelectedDay();
    this._chainedDays = selectedDay.days;
  }

  resetUpdatedConfig() {
    var thermoConfig = JSON.parse(this._savedConfig);
    this._updatedConfig = thermoConfig;

    var existingTodoOptions = [];
    thermoConfig.configs.forEach(config => {
      existingTodoOptions.push(config.name);
    });

    existingTodoOptions.unshift(this._manualOption);
    existingTodoOptions.push(this._createOption);

    this._dropDownOptions = [...existingTodoOptions];
  }

  saveConfigToHass() {
    var newConfig = JSON.stringify(this._updatedConfig);
    if (this._savedConfig) {
      this._hass.callService("todo", "update_item", {
        entity_id: this._entity,
        item: this._savedConfig,
        rename: newConfig
      });
    } else {
      this._hass.callService("todo", "add_item", {
        entity_id: this._entity,
        item: newConfig
      });
    }
    this.getThermoConfigStringFromHass()
      .then(thermoConfigString => this._savedConfig = thermoConfigString);
  }

  getThermoConfigStringFromHass() {
    return this.hassCals
      .callServicWithResponse(this._hass, "todo", "get_items", this._entity)
      .then(items => {
        var thermoConfigString: string;
        var todo = (items as any).response[this._entity];
        if (todo === undefined) {
          return thermoConfigString;
        }
        todo.items.forEach(element => {
          var summary = element.summary;
          if (summary.includes(todoConfName)) {
            thermoConfigString = summary;
          }
        });
        return thermoConfigString
      });
  }

  initTodo() {
    this.getThermoConfigStringFromHass()
      .then(thermoConfigString => {
        if (thermoConfigString === undefined) {
          this._updatedConfig = {
            name: todoConfName,
            configs: []
          };
          return;
        }
        this._savedConfig = thermoConfigString;
        this.resetUpdatedConfig();
      });
  }

  // card configuration
  static getConfigElement() {
    return document.createElement("custom-thermostat");
  }

  static getStubConfig() {
    return {
      entity: "input_select.tempprofiless",
      header: "",
    };
  }
}
