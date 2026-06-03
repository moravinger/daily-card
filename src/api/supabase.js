import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Получить карточку по дате (UTC)
 * @param {string} date - дата в формате YYYY-MM-DD
 * @returns {Promise<object>} - карточка или null
 */
export async function getCardByDate(date) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('publish_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = не найдена строка, это нормально
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching card:', error);
    throw error;
  }
}

/**
 * Загрузить картинку в Storage
 * @param {File} file - файл картинки
 * @param {string} date - дата в формате YYYY-MM-DD
 * @returns {Promise<string>} - публичный URL картинки
 */
export async function uploadCardImage(file, date) {
  try {
    // Валидация
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Файл слишком большой (максимум 5 МБ)');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Это не изображение');
    }

    // Генерируем имя файла: card_YYYY-MM-DD.jpg
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `card_${date}.${ext}`;

    // Загружаем в Storage
    const { data, error } = await supabase.storage
      .from('card-images')
      .upload(fileName, file, {
        upsert: true, // перезаписать, если существует
      });

    if (error) throw error;

    // Получаем публичный URL
    const { data: publicUrlData } = supabase.storage
      .from('card-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Создать или обновить карточку
 * @param {string} date - дата в формате YYYY-MM-DD
 * @param {string} imageUrl - URL картинки
 * @param {string} caption - подпись (опционально)
 * @returns {Promise<object>} - созданная/обновленная карточка
 */
export async function saveCard(date, imageUrl, caption = '') {
  try {
    // Проверяем, существует ли уже карточка на эту дату
    const existing = await getCardByDate(date);

    if (existing) {
      // Обновляем
      const { data, error } = await supabase
        .from('cards')
        .update({
          image_url: imageUrl,
          caption: caption,
          updated_at: new Date().toISOString(),
        })
        .eq('publish_date', date)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Создаём новую
      const { data, error } = await supabase
        .from('cards')
        .insert([
          {
            publish_date: date,
            image_url: imageUrl,
            caption: caption,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error saving card:', error);
    throw error;
  }
}
