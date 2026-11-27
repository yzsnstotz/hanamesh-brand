import korean from './locale/ko.json' with {type: 'json'};
import vietnamese from './locale/vi.json' with {type: 'json'};
import indonesian from './locale/id.json' with {type: 'json'};

const languages = [
  ['ko', '한국어', korean],
  ['vi', 'Tiếng Việt', vietnamese],
  ['id', 'Bahasa Indonesia', indonesian],
];

export const inject = ['locale'];

export function apply(ctx) {
  ctx.effect(() => {
    const owned = [];
    const dispose = () => {
      while (owned.length) owned.pop()();
    };
    try {
      for (const [id, label, dictionaries] of languages) {
        owned.push(ctx.locale.addLanguage({id, label, fallback: 'en'}));
        for (const [namespace, dictionary] of Object.entries(dictionaries)) {
          owned.push(ctx.locale.register(namespace, id, dictionary));
        }
      }
    } catch (error) {
      dispose();
      throw error;
    }
    return dispose;
  }, 'hanamesh-brand-locales: languages and dictionaries');
}
