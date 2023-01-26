module ApplicationHelper

  def explore_page?
    current_page?(about_ucubed_path) or current_page?(articles_path) or current_page?(free_resources_path)
  end
end
