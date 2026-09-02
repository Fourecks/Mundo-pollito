import fs from 'fs';
let content = fs.readFileSync('components/NotesSection.tsx', 'utf-8');

const target = `                  </div>
                </div>
              )}
            </>
        ) : (`;

content = content.replace(target, `                  </div>
                </div>
              )}
            </div>
          </>
        ) : (`);

fs.writeFileSync('components/NotesSection.tsx', content);
