import commands from '../../commands';
import GlobalOptions from '../../../../GlobalOptions';
import {
  CommandOption, CommandValidate
} from '../../../../Command';
import GraphCommand from "../../../base/GraphCommand";
import request from '../../../../request';
import * as path from 'path';
import * as fs from 'fs';

const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  period?: string;
  date?: string;
  outputFile?: string;
}

class TeamsReportDeviceUsageUserDetailCommand extends GraphCommand {
  public get name(): string {
    return `${commands.TEAMS_REPORT_DEVICEUSAGEUSERDETAIL}`;
  }

  public get description(): string {
    return 'Gets information about Microsoft Teams device usage by user';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.period = args.options.period;
    telemetryProps.date = typeof args.options.date !== 'undefined';
    telemetryProps.outputFile = typeof args.options.outputFile !== 'undefined';
    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const periodParameter: string = args.options.period ? `getTeamsDeviceUsageUserDetail(period='${encodeURIComponent(args.options.period)}')` : '';
    const dateParameter: string = args.options.date ? `getTeamsDeviceUsageUserDetail(date=${encodeURIComponent(args.options.date)})` : '';
    const endpoint: string = `${this.resource}/v1.0/reports/${(args.options.period ? periodParameter : dateParameter)}`;

    const requestOptions: any = {
      url: endpoint,
      headers: {
        accept: 'application/json;odata.metadata=none'
      },
      json: true
    };

    request
      .get(requestOptions)
      .then((res: any): void => {
        let content: string = '';
        let cleanResponse = this.removeEmptyLines(res);

        if (args.options.output && args.options.output.toLowerCase() === 'json') {
          const reportdata: any = this.getReport(cleanResponse);
          content = JSON.stringify(reportdata);
        }
        else {
          content = cleanResponse;
        }

        if (!args.options.outputFile) {
          cmd.log(content);
        }
        else {
          fs.writeFileSync(args.options.outputFile, content, 'utf8');
          if (this.verbose) {
            cmd.log(`File saved to path '${args.options.outputFile}'`);
          }
        }

        cb();
      }, (err: any): void => this.handleRejectedODataJsonPromise(err, cmd, cb));
  }

  private removeEmptyLines(input: string): string {
    const rows: string[] = input.split('\n');
    const cleanRows = rows.filter(Boolean);
    return cleanRows.join('\n');
  }

  private getReport(res: string): any {
    const rows: string[] = res.split('\n');
    const jsonObj: any = [];
    const headers: string[] = rows[0].split(',');

    for (let i = 1; i < rows.length; i++) {
      const data: string[] = rows[i].split(',');
      let obj: any = {};
      for (let j = 0; j < data.length; j++) {
        obj[headers[j].trim()] = data[j].trim();
      }
      jsonObj.push(obj);
    }

    return jsonObj;
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-p, --period [period]',
        description: 'The length of time over which the report is aggregated. Supported values D7|D30|D90|D180',
        autocomplete: ['D7', 'D30', 'D90', 'D180']
      },
      {
        option: '-d, --date [date]',
        description: 'The date for which you would like to view the users who performed any activity. Supported date format is YYYY-MM-DD'
      },
      {
        option: '-f, --outputFile [outputFile]',
        description: 'Path to the file where the Microsoft Teams device usage by user report should be stored in'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {
      if (!args.options.period && !args.options.date) {
        return 'You can\'t run this command without period or date parameter.';
      }

      if (args.options.period && args.options.date) {
        return 'You can\'t use period and date parameters together.';
      }

      if (args.options.period) {
        if (['D7', 'D30', 'D90', 'D180'].indexOf(args.options.period) < 0) {
          return `${args.options.period} is not a valid period type. The supported values are D7|D30|D90|D180`;
        }
      }

      if (args.options.date && !((args.options.date as string).match(/^\d{4}-\d{2}-\d{2}$/))) {
        return `Provide a valid date in YYYY-MM-DD format`;
      }

      if (args.options.outputFile && !fs.existsSync(path.dirname(args.options.outputFile))) {
        return `The specified path ${path.dirname(args.options.outputFile)} doesn't exist`;
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    log(vorpal.find(this.name).helpInformation());
    log(
      `  Remarks:

    As this report is only available for the past 28 days, date parameter value
    should be a date from that range.

  Examples:

    Gets information about Microsoft Teams device usage by user for the last week
      ${commands.TEAMS_REPORT_DEVICEUSAGEUSERDETAIL} --period D7

    Gets information about Microsoft Teams device usage by user for
    May 1, 2019
      ${commands.TEAMS_REPORT_DEVICEUSAGEUSERDETAIL} --date 2019-05-01

    Gets information about Microsoft Teams device usage by user for the last week 
    and exports the report data in the specified path in text format
      ${commands.TEAMS_REPORT_DEVICEUSAGEUSERDETAIL} --period D7 --output text --outputFile 'C:/report.txt'

    Gets information about Microsoft Teams device usage by user for the last week
    and exports the report data in the specified path in json format
      ${commands.TEAMS_REPORT_DEVICEUSAGEUSERDETAIL} --period D7 --output json --outputFile 'C:/report.json'
`);
  }
}

module.exports = new TeamsReportDeviceUsageUserDetailCommand();