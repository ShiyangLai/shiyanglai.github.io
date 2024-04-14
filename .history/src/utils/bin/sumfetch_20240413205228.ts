import config from '../../../config.json';

const sumfetch = async (args: string[]): Promise<string> => {
  if (config.ascii === 'shiyang') {
    return `                                                                     
                         ▐▒▒▄                                ▒
                         ▐▓▓▓▒ ░░          ▄▄▓▓▓▓▓▓▓▄▄      ▐▒
                          ▓▓▓▓▓▒░░░░░    ▄██████▓  ▐▓▓▓▓▄░░ ▐▒
                          ▓▓▓▓▓▓▒░▒▒   ▄████▀▀░░░░     ▀▓▓▒░▒▒░
                          ▐▓▓▓▓▓▓▒▒▓▒▒███▀░░░░░░░         ▀▓▄▒▒         ░
                           ▓▓▓▓▓▓▓█░▒▓█▒░░░░░░░░           ░▀▒▒▒
                    ░░      ▓▓▓███▒▒▐█▒░░░░░░░░░░           ░░▓▒░
                            ▓▓▒▒▒▒▒▒▀█▓▌░░░░░░▄███▓        ▐▓▓▒▓▓▄                   sumfetch: summary display
                     ░      ▓▓▀▀▒▒▒▒▒▓█▓▌░░░░█████▓▓       ▐▀▒▓░▓▓▒░                ----------------------------
                           ▓▓░░▄░▒▒▓▒▓▓██▒░  ▀▒▒▒▒░░             ▓▒▒                 ABOUT
                          ▄▓▓▒▓▒▒▒▓▓▓▓▓▓█▒               ░░      ▒▒                  ${config.name}
                          ▐▓▓▒▒▒▒▓█▓▓▓██▓▒                                            | incoming phd student at uchicago, trained
           ▄▄░░░░░░░░░░    ▐▓▓▓▓▓▓▓█▓▓██▌▒                                            | in both sociology and data science.
          ▒▒▒▒░░░░░░░░░░    ▐▓▓▓▓▓▓▓███▀▒░                                           <u><a href="${config.resume_url}" target="_blank">resume</a></u>
        ▒▒▒▒▒▒▒▒▒▒▒░░░░     ▐░░▀▓███▀▒░▒░░░▄                  ░░▒░                   <u><a href="${config.repo}" target="_blank">github repo</a></u>
       ▒▒▒▒▒▒▒▒▒▒▒▒▀      ▐░▒▒▒▒▒▒▒▒▒▒▒░░░░░▒░░░░  ░░░        ▐                      <u><a href="${config.google_scholar}" target="_blank">google scholar</a></u>
      ▐▒▓▓▓▓▓▒▒▒▒▒       ▒░▒▒▒▒▒░▒▒▒▒▒▒▒░▒▀░░▒▒░░░░░         ░                      ----------------------------
      ▓▓▓▓▓▓▓▓▓▓▒▒▌       ▐▒▒▒▒▒▒▓▒▒▒▒▒▒▒░░▒░ ░▒▒░          ░                        CONTACT 
      ▓████▓▓▓▓▓▓▓▓      ▄▒▒▒▒▒▒▒▓▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░░░░░░░░░░░░                   <u><a href="mailto:${config.email}" target="_blank">${config.email}</a></u>
      ▀██████▓▓▓▓▓▓▓▓▒▄▒░▒▒▒▒▒▒▒▒▒▓▒▒▒▒▒▒▒▒░░░▀ ▀░░░░░░░░░▒▒▒▀                       <u><a href="https://linkedin.com/in/${config.social.linkedin}" target="_blank">linkedin.com/in/${config.social.linedin_name}</a></u>
       ▓██████▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▓▒▒▒▒▒▒░░░         ░▒░░▐▒▒
        ▀██████████████▒▒▒▒▒▒▒▒▒▒▒▒▓▒▒▒▒▒▒░░░░         ▒▓▓▒░
          ▀██████████▓▒▒▓▓▓▒▒▒▒▒▒▒▒▒▓▒▒▒▒▒▒▒░░░░░      ▐▓▓▒▒▒░░░░
           ▄▄▓▓██████▒▒▒▓▓▓▒▒▒▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░▒░░░▒░██▓▓▒▒▒▒▒░▒░▐▒░▒░▄
            ▐░▒▒▒▒▒▒▒▒▀▀▀▀▀▀▀▀▀▀▀▒░▒▒▀▀▀▀▀▀▀▀▀▀▒▒▒▒▒▒▒░░░░░░▒▀▒▒░▒▒▒▒▒▒░░
    `
  }
};

export default sumfetch;
