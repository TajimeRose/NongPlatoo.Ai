"""
News API routes for managing news articles.
Provides CRUD operations for news with filtering, view tracking, and publication control.
"""
from flask import Blueprint, request, jsonify
from sqlalchemy import desc, or_
from backend.db import session_scope, News
from datetime import datetime

news_bp = Blueprint('news', __name__, url_prefix='/api/news')

@news_bp.route('', methods=['GET'])
def get_news_list():
    """
    Get list of news articles with optional filtering.
    
    Query params:
        - category: Filter by category
        - published: Filter by published status (true/false)
        - search: Search in title_th, summary_th
        - limit: Max number of results (default: 50)
        - offset: Skip first N results (default: 0)
    """
    try:
        with session_scope() as session:
            # Build query
            query = session.query(News)
            
            # Filter by published status
            published = request.args.get('published', 'true').lower()
            if published == 'true':
                query = query.filter(News.is_published == True)
            elif published == 'false':
                query = query.filter(News.is_published == False)
            
            # Filter by category
            category = request.args.get('category')
            if category:
                query = query.filter(News.category == category)
            
            # Search in title and summary
            search = request.args.get('search')
            if search:
                search_pattern = f"%{search}%"
                query = query.filter(
                    or_(
                        News.title_th.ilike(search_pattern),
                        News.summary_th.ilike(search_pattern),
                        News.title.ilike(search_pattern),
                        News.summary.ilike(search_pattern)
                    )
                )
            
            # Order by published date (newest first)
            query = query.order_by(desc(News.published_at))
            
            # Pagination
            limit = int(request.args.get('limit', 50))
            offset = int(request.args.get('offset', 0))
            query = query.limit(limit).offset(offset)
            
            news_list = query.all()
            
            return jsonify({
                "success": True,
                "data": [news.to_dict() for news in news_list],
                "count": len(news_list)
            }), 200
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@news_bp.route('/<int:news_id>', methods=['GET'])
def get_news_detail(news_id):
    """
    Get single news article by ID.
    Increments view count automatically.
    """
    try:
        with session_scope() as session:
            news = session.query(News).filter(News.id == news_id).first()
            
            if not news:
                return jsonify({
                    "success": False,
                    "error": "News not found"
                }), 404
            
            # Increment view count
            news.views += 1
            session.commit()
            
            return jsonify({
                "success": True,
                "data": news.to_dict()
            }), 200
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@news_bp.route('', methods=['POST'])
def create_news():
    """
    Create a new news article.
    
    Request body:
        {
            "title": "English Title",
            "title_th": "ชื่อข่าวภาษาไทย",
            "summary": "English summary",
            "summary_th": "สรุปข่าวภาษาไทย",
            "content": "Full English content",
            "content_th": "เนื้อหาเต็มภาษาไทย",
            "category": "กิจกรรม",
            "image_url": "https://...",
            "author": "Author Name",
            "is_published": true
        }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        # Validate required fields
        if not data.get('title_th'):
            return jsonify({
                "success": False,
                "error": "title_th is required"
            }), 400
        
        with session_scope() as session:
            news = News(
                title=data.get('title', ''),
                title_th=data['title_th'],
                summary=data.get('summary'),
                summary_th=data.get('summary_th'),
                content=data.get('content'),
                content_th=data.get('content_th'),
                category=data.get('category'),
                image_url=data.get('image_url'),
                author=data.get('author'),
                is_published=data.get('is_published', True),
                views=0
            )
            
            session.add(news)
            session.commit()
            session.refresh(news)
            
            return jsonify({
                "success": True,
                "data": news.to_dict(),
                "message": "News created successfully"
            }), 201
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@news_bp.route('/<int:news_id>', methods=['PUT'])
def update_news(news_id):
    """
    Update an existing news article.
    
    Request body: Same as create_news, all fields optional
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        with session_scope() as session:
            news = session.query(News).filter(News.id == news_id).first()
            
            if not news:
                return jsonify({
                    "success": False,
                    "error": "News not found"
                }), 404
            
            # Update fields if provided
            if 'title' in data:
                news.title = data['title']
            if 'title_th' in data:
                news.title_th = data['title_th']
            if 'summary' in data:
                news.summary = data['summary']
            if 'summary_th' in data:
                news.summary_th = data['summary_th']
            if 'content' in data:
                news.content = data['content']
            if 'content_th' in data:
                news.content_th = data['content_th']
            if 'category' in data:
                news.category = data['category']
            if 'image_url' in data:
                news.image_url = data['image_url']
            if 'author' in data:
                news.author = data['author']
            if 'is_published' in data:
                news.is_published = data['is_published']
            
            news.updated_at = datetime.now()
            
            session.commit()
            session.refresh(news)
            
            return jsonify({
                "success": True,
                "data": news.to_dict(),
                "message": "News updated successfully"
            }), 200
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@news_bp.route('/<int:news_id>', methods=['DELETE'])
def delete_news(news_id):
    """
    Delete a news article by ID.
    """
    try:
        with session_scope() as session:
            news = session.query(News).filter(News.id == news_id).first()
            
            if not news:
                return jsonify({
                    "success": False,
                    "error": "News not found"
                }), 404
            
            session.delete(news)
            session.commit()
            
            return jsonify({
                "success": True,
                "message": "News deleted successfully"
            }), 200
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
