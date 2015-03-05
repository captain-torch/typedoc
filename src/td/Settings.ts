module td
{
    export enum ModuleKind {
        None = 0,
        CommonJS = 1,
        AMD = 2,
    }

    export enum ScriptTarget {
        ES3 = 0,
        ES5 = 1,
        ES6 = 2,
        Latest = 2,
    }

    export enum SourceFileMode {
        File, Modules
    }


    export interface IParameter
    {
        name:string;
        short?:string;
        help:string;
        type?:ParameterType;
        hint?:ParameterHint;
        scope?:ParameterScope;
        map?:{};
        mapError?:string;
        isArray?:boolean;
        defaultValue?:any;
    }

    export interface IParameterHelp {
        marginLength:number;
        usage:string[];
        description:string[];
    }

    export interface IParameterProvider {
        getParameters():IParameter[];
    }

    export enum ParameterHint {
        File,
        Directory
    }

    export enum ParameterType {
        String,
        Number,
        Boolean,
        Map
    }


    export enum ParameterScope {
        TypeDoc, TypeScript
    }


    /**
     * Options object interface declaration.
     *
     * Other components might add additional option declarations.
     */
    export interface IOptions
    {
        /**
         * The path of the theme that should be used.
         */
        theme:string;

        /**
         * The list of npm plugins that should be loaded.
         */
        plugins?:string[];

        /**
         * A pattern for files that should be excluded when a path is specified as source.
         */
        exclude?:string;

        /**
         * The path of the output directory.
         */
        out?:string;

        /**
         * Path and filename of the json file.
         */
        json?:string;

        /**
         * Should verbose messages be printed?
         */
        verbose?:boolean;

        /**
         * Does the user want to display the help message?
         */
        help?:boolean;

        /**
         * Does the user want to know the version number?
         */
        version?:boolean;
    }


    /**
     * A parser that can read command line arguments, option files and javascript objects.
     */
    export class OptionsParser
    {
        /**
         * The parsed TypeDoc options.
         */
        options:IOptions;

        /**
         * The parsed TypeScript compiler options.
         */
        compilerOptions:ts.CompilerOptions;

        /**
         * The list of discovered input files.
         */
        inputFiles:string[];

        /**
         * The application that stores the parsed settings.
         */
        private application:IApplication;

        /**
         * Map of parameter names and their definitions.
         */
        private arguments:ts.Map<IParameter> = {};

        /**
         * Map of parameter short names and their full equivalent.
         */
        private shortNames:ts.Map<string> = {};

        /**
         * A list of all TypeScript parameters that should be ignored.
         */
        private static IGNORED_TS_PARAMS:string[] = [
            'out', 'outDir', 'version', 'help',
            'watch', 'declaration', 'mapRoot',
            'sourceMap', 'removeComments'
        ];



        /**
         * Create a new OptionsParser instance.
         *
         * @param application  The application that stores the parsed settings
         */
        constructor(application:IApplication) {
            this.application = application;

            this.reset();
            this.addDefaultParameters();
            this.addCompilerParameters();
        }


        /**
         * Register a parameter definition.
         *
         * @param parameters One or multiple parameter definitions that should be registered.
         */
        addParameter(...parameters:IParameter[]) {
            parameters.forEach((parameter) => {
                parameter.type = parameter.type || ParameterType.String;
                parameter.scope = parameter.scope || ParameterScope.TypeDoc;
                this.arguments[parameter.name.toLowerCase()] = parameter;

                if (parameter.short) {
                    this.shortNames[parameter.short.toLowerCase()] = parameter.name;
                }

                if (parameter.defaultValue && !parameter.isArray) {
                    var name = parameter.name;
                    var target = (parameter.scope == ParameterScope.TypeDoc) ? this.options : this.compilerOptions;
                    if (!target[name]) {
                        target[name] = parameter.defaultValue;
                    }
                }
            });
        }


        /**
         * Register the command line parameters.
         */
        addCommandLineParameters() {
            this.addParameter({
                name:  'out',
                help:  'Specifies the location the documentation should be written to.',
                hint:  ParameterHint.Directory
            }, {
                name:  'json',
                help:  'Specifies the location and file name a json file describing the project is written to.',
                hint:  ParameterHint.File
            },{
                name:  'version',
                short: 'v',
                help:  'Print the TypeDoc\'s version.',
                type:  ParameterType.Boolean
            },{
                name:  'help',
                short: 'h',
                help:  'Print this message.',
                type:  ParameterType.Boolean
            });
        }


        /**
         * Register the default parameters.
         */
        private addDefaultParameters() {
            this.addParameter({
                name: 'theme',
                help: 'Specify the path to the theme that should be used or \'default\' or \'minimal\' to use built-in themes.',
                type: ParameterType.String
            }, {
                name: 'exclude',
                help: 'Define a pattern for excluded files when specifying paths.',
                type: ParameterType.String
            }, {
                name: 'plugin',
                help: '',
                type: ParameterType.String
            },{
                name: 'verbose',
                help: 'Print more information while TypeDoc is running.',
                type: ParameterType.Boolean
            });
        }


        /**
         * Register all TypeScript related properties.
         */
        private addCompilerParameters() {
            var ignored = OptionsParser.IGNORED_TS_PARAMS;

            ts.optionDeclarations.forEach((option:ts.CommandLineOption) => {
                if (ignored.indexOf(option.name) != -1) return;
                var param = <IParameter>{
                    name:  option.name,
                    short: option.shortName,
                    help:  option.description ? option.description.key : null,
                    scope: ParameterScope.TypeDoc
                };

                switch (option.type) {
                    case "number":
                        param.type = ParameterType.Number;
                        break;
                    case "boolean":
                        param.type = ParameterType.Boolean;
                        break;
                    case "string":
                        param.type = ParameterType.String;
                        break;
                    default:
                        param.type = ParameterType.Map;
                        param.map = option.type;
                        if (option.error) {
                            var error = ts.createCompilerDiagnostic(option.error);
                            param.mapError = error.messageText;
                        }
                }

                switch (option.paramType) {
                    case ts.Diagnostics.FILE:
                        param.hint = ParameterHint.File;
                        break;
                    case ts.Diagnostics.DIRECTORY:
                        param.hint = ParameterHint.Directory;
                        break;
                }

                this.addParameter(param);
            });
        }


        /**
         * Add an input/source file.
         *
         * The input files will be used as source files for the compiler. All command line
         * arguments without parameter will be interpreted as being input files.
         *
         * @param fileName The path and filename of the input file.
         */
        addInputFile(fileName:string) {
            this.inputFiles.push(fileName);
        }


        /**
         * Retrieve a parameter by its name.
         *
         * @param name  The name of the parameter to look for.
         * @returns The parameter definition or NULL when not found.
         */
        getParameter(name:string):IParameter {
            if (ts.hasProperty(this.shortNames, name)) {
                name = this.shortNames[name];
            }

            if (ts.hasProperty(this.arguments, name)) {
                return this.arguments[name];
            } else {
                return null;
            }
        }


        /**
         * Set the option described by the given parameter description to the given value.
         *
         * @param param  The parameter description of the option to set.
         * @param value  The target value of the option.
         * @returns TRUE on success, otherwise FALSE.
         */
        setOption(param:IParameter, value?:any):boolean {
            if (param.isArray && Util.isArray(value)) {
                var result = true;
                value.forEach((value) => result = this.setOption(param, value) && result);
                return result;
            }

            try {
                value = OptionsParser.convert(param, value);
            } catch (error) {
                this.application.log(error.message, LogLevel.Error);
                return false;
            }

            var name = param.name;
            var target = (param.scope == ParameterScope.TypeDoc) ? this.options : this.compilerOptions;
            if (param.isArray) {
                (target[name] = target[name] || []).push(value);
            } else {
                target[name] = value;
            }

            return true;
        }


        /**
         * Reset the output data of this parser instance.
         *
         * This will not reset the registered parameters!
         */
        reset() {
            this.options = OptionsParser.createOptions();
            this.compilerOptions = OptionsParser.createCompilerOptions();
            this.inputFiles = [];
        }


        /**
         * Apply the values of the given options object.
         *
         * @param obj  The object whose properties should be applied.
         * @param ignoreUnknownArgs  Should unknown arguments be ignored? If so the parser
         *   will simply skip all unknown arguments.
         * @returns TRUE on success, otherwise FALSE.
         */
        parseObject(obj:any, ignoreUnknownArgs?:boolean):boolean {
            var result = true;
            for (var key in obj) {
                if (!obj.hasOwnProperty(key)) continue;

                var parameter = this.getParameter(key);
                if (!parameter) {
                    if (!ignoreUnknownArgs) {
                        var msg = ts.createCompilerDiagnostic(ts.Diagnostics.Unknown_compiler_option_0, key);
                        this.application.log(msg.messageText, LogLevel.Error);
                        result = false;
                    }
                } else {
                    result = this.setOption(parameter, obj[key]) && result;
                }
            }

            return result;
        }


        /**
         * Read and store the given list of arguments.
         *
         * @param args  The list of arguments that should be parsed. When omitted the
         *   current command line arguments will be used.
         * @param ignoreUnknownArgs  Should unknown arguments be ignored? If so the parser
         *   will simply skip all unknown arguments.
         * @returns TRUE on success, otherwise FALSE.
         */
        parseArguments(args?:string[], ignoreUnknownArgs?:boolean):boolean {
            var index = 0;
            var result = true;
            args = args || process.argv.splice(2);

            var error = (message:ts.DiagnosticMessage, ...args: any[]) => {
                if (ignoreUnknownArgs) return;
                var msg = ts.createCompilerDiagnostic.call(this, arguments);
                this.application.log(msg.messageText, LogLevel.Error);
                result = false;
            };

            while (index < args.length) {
                var arg = args[index++];

                if (arg.charCodeAt(0) === ts.CharacterCodes.at) {
                    result = this.parseResponseFile(arg.slice(1), ignoreUnknownArgs) && result;
                } else if (arg.charCodeAt(0) === ts.CharacterCodes.minus) {
                    arg = arg.slice(arg.charCodeAt(1) === ts.CharacterCodes.minus ? 2 : 1).toLowerCase();

                    var parameter = this.getParameter(arg);
                    if (!parameter) {
                        error(ts.Diagnostics.Unknown_compiler_option_0, arg);
                    } else if (parameter.type !== ParameterType.Boolean) {
                        if (!args[index]) {
                            error(ts.Diagnostics.Compiler_option_0_expects_an_argument, parameter.name);
                        } else {
                            result = this.setOption(parameter, args[index++]) && result;
                        }
                    } else {
                        result = this.setOption(parameter) && result;
                    }
                } else if (!ignoreUnknownArgs) {
                    this.addInputFile(arg);
                }
            }

            return result;
        }


        /**
         * Read the arguments stored in the given file.
         *
         * @param filename  The path and filename that should be parsed.
         * @param ignoreUnknownArgs  Should unknown arguments be ignored?
         * @returns TRUE on success, otherwise FALSE.
         */
        parseResponseFile(filename:string, ignoreUnknownArgs?:boolean):boolean {
            var text = ts.sys.readFile(filename);

            if (!text) {
                var error = ts.createCompilerDiagnostic(ts.Diagnostics.File_0_not_found, filename);
                this.application.log(error.messageText, LogLevel.Error);
                return false;
            }

            var args:string[] = [];
            var pos = 0;
            while (true) {
                while (pos < text.length && text.charCodeAt(pos) <= ts.CharacterCodes.space) pos++;
                if (pos >= text.length) break;

                var start = pos;
                if (text.charCodeAt(start) === ts.CharacterCodes.doubleQuote) {
                    pos++;
                    while (pos < text.length && text.charCodeAt(pos) !== ts.CharacterCodes.doubleQuote) pos++;
                    if (pos < text.length) {
                        args.push(text.substring(start + 1, pos));
                        pos++;
                    } else {
                        var error = ts.createCompilerDiagnostic(ts.Diagnostics.Unterminated_quoted_string_in_response_file_0, filename);
                        this.application.log(error.messageText, LogLevel.Error);
                        return false;
                    }
                } else {
                    while (text.charCodeAt(pos) > ts.CharacterCodes.space) pos++;
                    args.push(text.substring(start, pos));
                }
            }

            return this.parseArguments(args, ignoreUnknownArgs);
        }


        getParameterHelp(scope:ParameterScope):IParameterHelp {
            // Sort our options by their names, (e.g. "--noImplicitAny" comes before "--watch")
            var optsList = [];
            var marginLength = 0;
            for (var key in this.arguments) {
                if (!this.arguments.hasOwnProperty(key)) continue;
                var argument = this.arguments[key];
                if (argument.scope === scope) {
                    optsList.push(argument);
                }
            }

            optsList.sort((a, b) => {
                return <number>ts.compareValues<string>(a.name.toLowerCase(), b.name.toLowerCase())
            });

            // We want our descriptions to align at the same column in our output,
            // so we keep track of the longest option usage string.
            var usageColumn: string[] = []; // Things like "-d, --declaration" go in here.
            var descriptionColumn: string[] = [];

            for (var i = 0; i < optsList.length; i++) {
                var option = optsList[i];

                // If an option lacks a description,
                // it is not officially supported.
                if (!option.description) {
                    continue;
                }

                var usageText = " ";
                if (option.shortName) {
                    usageText += "-" + option.shortName;
                    if (option.hint) usageText += ParameterHint[option.hint].toUpperCase();
                    usageText += ", ";
                }

                usageText += "--" + option.name;
                if (option.hint) usageText += ParameterHint[option.hint].toUpperCase();

                usageColumn.push(usageText);
                descriptionColumn.push(option.description.key);

                // Set the new margin for the description column if necessary.
                marginLength = Math.max(usageText.length, marginLength);
            }

            return {marginLength:marginLength, usage:usageColumn, description:descriptionColumn};
        }


        /**
         * Print some usage information.
         *
         * Taken from TypeScript (src/compiler/tsc.ts)
         */
        public toString():string {
            var typeDoc = this.getParameterHelp(ParameterScope.TypeDoc);
            var typeScript = this.getParameterHelp(ParameterScope.TypeScript);

            var output = [];
            output.push('Usage:');
            output.push(' typedoc --mode modules --out path/to/documentation path/to/sourcefiles');
            output.push('', 'TypeDoc options:');
            pushDeclarations(typeDoc);
            output.push('', 'TypeScript options:');
            pushDeclarations(typeScript);
            output.push('');
            return output.join(ts.sys.newLine);

            // Special case that can't fit in the loop.
            function addFileOption(columns:IParameterHelp) {
                var usageText = " @<file>";
                columns.usage.push(usageText);
                columns.description.push(ts.Diagnostics.Insert_command_line_options_and_files_from_a_file.key);
                columns.marginLength = Math.max(usageText.length, columns.marginLength);
            }

            // Print out each row, aligning all the descriptions on the same column.
            function pushDeclarations(columns:IParameterHelp) {
                for (var i = 0; i < columns.usage.length; i++) {
                    var usage = columns.usage[i];
                    var description = columns.description[i];
                    output.push(usage + makePadding(columns.marginLength - usage.length + 2) + description);
                }
            }

            function makePadding(paddingLength: number): string {
                return Array(paddingLength + 1).join(" ");
            }
        }


        /**
         * Convert the given value according to the type setting of the given parameter.
         *
         * @param param  The parameter definition.
         * @param value  The value that should be converted.
         * @returns The converted value.
         */
        static convert(param:IParameter, value?:any):any {
            switch (param.type) {
                case ParameterType.Number:
                    value = parseInt(value);
                    break;
                case ParameterType.Boolean:
                    value = (typeof value == 'undefined' ? true : !!value);
                    break;
                case ParameterType.String:
                    value = value || "";
                    break;
                case ParameterType.Map:
                    var map = <ts.Map<number>>param.map;
                    var key = (value || "").toLowerCase();
                    if (ts.hasProperty(map, key)) {
                        value = map[key];
                    } else if (param.mapError) {
                        throw new Error(param.mapError);
                    } else {
                        throw new Error(Util.format('Invalid option given for option "%s".', param.name));
                    }
                    break;
            }

            return value;
        }


        /**
         * Create an options object populated with the default values.
         *
         * @returns An options object populated with default values.
         */
        static createOptions():IOptions {
            return {
                theme: 'default'
            };
        }


        /**
         * Create the compiler options populated with the default values.
         *
         * @returns A compiler options object populated with default values.
         */
        static createCompilerOptions():ts.CompilerOptions {
            return <ts.CompilerOptions>{
                target: ts.ScriptTarget.ES3,
                module: ts.ModuleKind.None
            };
        }
    }
}