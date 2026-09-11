const fs = require('fs');
let code = fs.readFileSync('components/ProjectsWorkspace.tsx', 'utf-8');

// The replacement was:
// code = code.replace(formGastoOld, formGastoNew);
// and we replaced <div className="px-4 space-y-1"> with an AnimatePresence wrapping a motion.div
// Let's fix the closing tags around line 9152

const badSyntax = `                                    <span>Tiempo</span>
                                </button>
                            </motion.div>
                            )}

                            {quickAddActiveSheet === 'expense' && (`;

const fixedSyntax = `                                    <span>Tiempo</span>
                                </button>
                            </motion.div>
                            )}

                            {quickAddActiveSheet === 'expense' && (`;
                            
// Wait, looking at the error:
// /app/applet/components/ProjectsWorkspace.tsx:9152:30: ERROR: Unexpected closing "div" tag does not match opening "motion.div" tag
// 9150|                                      <span>Tiempo</span>
// 9151|                                  </button>
// 9152|                              </div>
// 9153|                          </motion.div>

code = code.replace(`                                </button>
                            </div>
                        </motion.div>
                    </div>`, `                                </button>
                            </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </div>`);
                    
code = code.replace(`                                </button>
                            </motion.div>
                            )}`, `                                </button>
                            </motion.div>
                            )}`);
                            
// Let's just use sed to read the exact lines
